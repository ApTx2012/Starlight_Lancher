use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use super::{ImportOverrides, instance_json, resolve_import_game_root};
use crate::{
    State,
    install::{InstallPhaseDetails, InstallProgressReporter},
    launcher::get_loader_version_from_profile,
    pack::{
        import::finish_import,
        install_from::{self, CreatePackDescription, PackDependency},
    },
    state::ModLoader,
};

/// Import a generic launcher instance folder into an Axolotl profile.
///
/// Runs in four stages: resolve the source folder, validate that it contains
/// a detectable Minecraft version, register the instance metadata, then copy
/// (or symlink) the files into the profile.
pub async fn import_generic(
    instance_folder: PathBuf,
    instance_id: &str,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
    symlink: bool,
    overrides: &ImportOverrides,
    instance_path: Option<PathBuf>, // For compatible mode: path to versions/<version>/
) -> crate::Result<()> {
    // Resolve the source layout. Three inputs describe the same import from
    // different angles and must be reconciled consistently:
    //
    // - `instance_folder`: the game root chosen by the caller (normally the
    //   `.minecraft` root for a PCL/HMCL install, or the folder itself).
    // - `instance_path`: when present, the specific `versions/<name>` folder
    //   the user selected. A `.minecraft` root can hold many versions; only
    //   this one belongs to the instance being imported.
    // - `overrides.game_dir_override`: the user's explicit version-isolation
    //   choice.
    //
    // The old behaviour copied/symlinked the whole `.minecraft` root and let
    // the version folder dangle, which produced vanilla-only copies (mods
    // stayed in versions/<name>) and cloned every sibling version too.
    let layout = resolve_import_layout(
        &instance_folder,
        instance_path.as_deref(),
        overrides.game_dir_override.as_deref(),
    );

    let info = detect_instance_info(&layout.json_source, overrides).await?;
    register_instance(instance_id, &layout.name, &info).await?;
    copy_instance_files(instance_id, &layout, reporter, details, symlink).await
}

/// The resolved source layout for a generic import.
///
/// `content_source` holds the shared game content (mods/saves/config) that
/// belongs to the instance; `version_dir` is the selected `versions/<name>`
/// folder. Both are merged into the instance directory by the copy/symlink
/// stage, so a version-isolated import keeps the root-level mods it used to
/// leave behind.
struct ImportLayout {
    /// Display name for the instance (the version folder name when isolated,
    /// otherwise the game root folder name).
    name: String,
    /// Directory the version JSON is detected from.
    json_source: PathBuf,
    /// Directory whose game content (mods/saves/config) belongs to the
    /// instance. For a shared root this is the root itself; for the "move the
    /// root content into versions/<name>" isolation strategy this is still the
    /// root, but its content is copied *into* the instance (which then becomes
    /// the game dir).
    content_source: Option<PathBuf>,
    /// Selected `versions/<name>` folder, when the source is a shared root.
    version_dir: Option<PathBuf>,
    /// Whether the instance uses version isolation.
    isolated: bool,
}

/// Reconciles the three import inputs into one layout.
///
/// Rules:
/// - When `instance_path` is given it is the authoritative version folder; the
///   instance is version-isolated unless the user explicitly asked to share.
/// - When the user asked to share, the `.minecraft` root is the game dir.
/// - Without a selected version folder, fall back to the old auto-detection so
///   direct folder imports keep working.
fn resolve_import_layout(
    instance_folder: &Path,
    selected_version: Option<&Path>,
    game_dir_override: Option<&str>,
) -> ImportLayout {
    let root_name = instance_folder
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "imported".to_string());

    // Explicit "version shared" choice: copy the whole `.minecraft` root.
    let shared_forced = game_dir_override
        .map(|dir| {
            let normalized = dir.trim_end_matches(['/', '\\']);
            normalized.eq_ignore_ascii_case(
                instance_folder
                    .to_string_lossy()
                    .trim_end_matches(['/', '\\']),
            )
        })
        .unwrap_or(false);

    if let Some(version_dir) = selected_version {
        let version_name = version_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| root_name.clone());

        if shared_forced {
            // User explicitly chose to share the `.minecraft` root even though
            // a version folder was selected.
            return ImportLayout {
                name: root_name,
                json_source: version_dir.to_path_buf(),
                content_source: Some(instance_folder.to_path_buf()),
                version_dir: Some(version_dir.to_path_buf()),
                isolated: false,
            };
        }

        // Version-isolated strategy (甲): the instance becomes the game dir.
        // The version files (`versions/<name>`) and the shared root content
        // (mods/saves/config) are both merged into the instance, so mods that
        // live at the `.minecraft` root survive the import instead of being
        // left behind.
        return ImportLayout {
            name: version_name,
            json_source: version_dir.to_path_buf(),
            content_source: Some(instance_folder.to_path_buf()),
            version_dir: Some(version_dir.to_path_buf()),
            isolated: true,
        };
    }

    // No explicit version folder: fall back to auto-detection.
    let (name, dotminecraft) = resolve_dotminecraft(instance_folder);
    let game_root = resolve_import_game_root(&dotminecraft);
    ImportLayout {
        name,
        json_source: dotminecraft.clone(),
        content_source: Some(game_root.clone()),
        version_dir: None,
        isolated: game_root != dotminecraft,
    }
}

/// Stage 1 — resolve the name and the `.minecraft` directory of an imported
/// instance folder. Falls back to the folder itself when there is no nested
/// `.minecraft` subdirectory.
pub(crate) fn resolve_dotminecraft(
    instance_folder: &Path,
) -> (String, PathBuf) {
    let name = instance_folder
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "imported".to_string());

    let dotminecraft = instance_folder.join(".minecraft");
    if dotminecraft.is_dir() {
        tracing::debug!(
            "import_generic: using .minecraft subdir at {}",
            dotminecraft.display()
        );
        (name, dotminecraft)
    } else {
        tracing::debug!(
            "import_generic: using folder directly at {}",
            instance_folder.display()
        );
        (name, instance_folder.to_path_buf())
    }
}

/// Stage 2 — validate the folder contains a Minecraft version JSON.
async fn detect_instance_info(
    dotminecraft: &Path,
    overrides: &ImportOverrides,
) -> crate::Result<instance_json::InstanceInfo> {
    tracing::debug!(
        "import_generic: about to detect instance_json at dotminecraft={}",
        dotminecraft.display()
    );
    let Some(mut info) = instance_json::detect(dotminecraft) else {
        let Some(game_version) = overrides
            .game_version
            .as_ref()
            .filter(|version| !version.trim().is_empty())
        else {
            tracing::warn!(
                "import_generic: instance_json::detect returned None for {}",
                dotminecraft.display()
            );
            return Err(crate::ErrorKind::InputError(
                "Could not detect Minecraft version. Make sure the folder contains a valid version JSON."
                    .into(),
            )
            .into());
        };
        return Ok(instance_json::InstanceInfo {
            vanilla_name: game_version.clone(),
            loader: overrides
                .loader
                .filter(|loader| *loader != ModLoader::Vanilla)
                .map(|loader| loader.as_str().to_string()),
            loader_version: overrides
                .loader_version
                .clone()
                .filter(|version| !version.is_empty() && version != "latest"),
            adjuncts: Vec::new(),
        });
    };

    if let Some(game_version) = overrides
        .game_version
        .as_ref()
        .filter(|version| !version.trim().is_empty())
    {
        info.vanilla_name.clone_from(game_version);
    }
    if let Some(loader) = overrides.loader {
        if loader == ModLoader::Vanilla {
            info.loader = None;
            info.loader_version = None;
            info.adjuncts.clear();
        } else {
            info.loader = Some(loader.as_str().to_string());
            info.loader_version = None;
        }
    }
    if let Some(loader_version) = overrides
        .loader_version
        .as_ref()
        .filter(|version| !version.is_empty() && *version != "latest")
    {
        info.loader_version = Some(loader_version.clone());
    }

    Ok(info)
}

/// Stage 3 — register the instance metadata (name, game version, loaders)
/// with the app database.
async fn register_instance(
    instance_id: &str,
    name: &str,
    info: &instance_json::InstanceInfo,
) -> crate::Result<()> {
    tracing::debug!(
        "import_generic: detect result: vanilla_name={} loader={:?} loader_version={:?}",
        info.vanilla_name,
        info.loader,
        info.loader_version
    );

    let description = CreatePackDescription {
        icon: None,
        override_title: Some(name.to_string()),
        project_id: None,
        version_id: None,
        instance_id: instance_id.to_string(),
        source_filename: None,
    };
    let dependencies = build_dependencies(info).await?;

    tracing::debug!(
        "import_generic: setting instance info with dependencies={:?}",
        dependencies
    );
    install_from::set_instance_information(
        instance_id.to_string(),
        &description,
        "Imported from folder",
        None,
        &dependencies,
        false,
    )
    .await?;
    Ok(())
}

/// Builds the dependency map from the detected game version and loader,
/// resolving the loader version from the metadata API when it is missing.
async fn build_dependencies(
    info: &instance_json::InstanceInfo,
) -> crate::Result<HashMap<PackDependency, String>> {
    let mut dependencies =
        HashMap::from([(PackDependency::Minecraft, info.vanilla_name.clone())]);
    let Some(ref loader) = info.loader else {
        tracing::debug!("import_generic: no loader detected, will be Vanilla");
        return Ok(dependencies);
    };
    let components = std::iter::once((
        loader.as_str(),
        info.loader_version.as_ref(),
    ))
    .chain(info.adjuncts.iter().filter_map(|(loader, version)| {
        (loader != "optifabric").then_some((loader.as_str(), version.as_ref()))
    }));
    for (loader, version) in components {
        if loader.eq_ignore_ascii_case("labymod") {
            return Err(crate::ErrorKind::InputError(
                "Unsupported loader LabyMod: Axolotl does not install, update, or repair LabyMod instances"
                    .to_string(),
            )
            .into());
        }
        let dep = loader_dependency(loader).ok_or_else(|| {
            crate::ErrorKind::InputError(format!(
                "Unsupported loader {loader}: the instance was not imported as Vanilla"
            ))
            .as_error()
        })?;
        let loader_version = resolve_loader_version(
            &info.vanilla_name,
            loader,
            version.map(String::as_str),
        )
        .await;
        match loader_version {
            Some(version) => {
                dependencies.insert(dep, version);
            }
            None => {
                return Err(crate::ErrorKind::InputError(format!(
                    "Could not resolve {loader} for Minecraft {}; the instance was not imported as Vanilla",
                    info.vanilla_name
                ))
                .into());
            }
        }
    }
    if let Some((_, version)) = info
        .adjuncts
        .iter()
        .find(|(loader, _)| loader == "optifabric")
    {
        let version = version.as_ref().ok_or_else(|| {
            crate::ErrorKind::InputError(
                "Imported OptiFabric component is missing its version"
                    .to_string(),
            )
        })?;
        dependencies.insert(PackDependency::OptiFabric, version.clone());
    }
    Ok(dependencies)
}

/// Maps a detected loader name to a dependency the launcher can install.
fn loader_dependency(loader: &str) -> Option<PackDependency> {
    match loader {
        "forge" => Some(PackDependency::Forge),
        "neoforge" => Some(PackDependency::NeoForge),
        "fabric" => Some(PackDependency::FabricLoader),
        "quilt" => Some(PackDependency::QuiltLoader),
        "optifine" => Some(PackDependency::OptiFine),
        "cleanroom" => Some(PackDependency::Cleanroom),
        "lite_loader" | "liteloader" => Some(PackDependency::LiteLoader),
        "legacy_fabric" | "legacyfabric" => Some(PackDependency::LegacyFabric),
        _ => None,
    }
}

/// Resolves a missing loader version by asking the metadata API for the
/// latest version compatible with the detected game version.
async fn resolve_loader_version(
    game_version: &str,
    loader: &str,
    requested_version: Option<&str>,
) -> Option<String> {
    if requested_version
        .is_some_and(|version| !version.is_empty() && version != "latest")
    {
        return requested_version.map(str::to_string);
    }
    let mod_loader = match loader {
        "forge" => Some(ModLoader::Forge),
        "neoforge" => Some(ModLoader::NeoForge),
        "fabric" => Some(ModLoader::Fabric),
        "quilt" => Some(ModLoader::Quilt),
        "optifine" => Some(ModLoader::OptiFine),
        "cleanroom" => Some(ModLoader::Cleanroom),
        "lite_loader" | "liteloader" => Some(ModLoader::LiteLoader),
        "legacy_fabric" | "legacyfabric" => Some(ModLoader::LegacyFabric),
        _ => None,
    }?;
    tracing::debug!(
        "import_generic: loader={} has no version, resolving latest for game_version={}",
        loader,
        game_version
    );
    match get_loader_version_from_profile(game_version, mod_loader, None).await
    {
        Ok(Some(lv)) => {
            tracing::debug!(
                "import_generic: resolved latest loader version: {}",
                lv.id
            );
            Some(lv.id)
        }
        Ok(None) => {
            tracing::warn!(
                "import_generic: no loader version found for {} {}",
                mod_loader.as_str(),
                game_version
            );
            None
        }
        Err(e) => {
            tracing::warn!(
                "import_generic: failed to resolve loader version: {e}",
            );
            None
        }
    }
}

/// Stage 4 — copy (or symlink) the source files into the instance profile.
///
/// Uses the reconciled [`ImportLayout`]: the shared content root (mods/saves/
/// config) and the selected `versions/<name>` folder are both merged into the
/// instance directory, so a version-isolated import keeps root-level content.
async fn copy_instance_files(
    instance_id: &str,
    layout: &ImportLayout,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
    symlink: bool,
) -> crate::Result<()> {
    let state = State::get().await?;
    tracing::debug!(
        "import_generic: finishing import for instance_id={} content_source={:?} version_dir={:?} isolated={}",
        instance_id,
        layout.content_source,
        layout.version_dir,
        layout.isolated
    );
    finish_import(
        instance_id,
        layout.content_source.clone(),
        layout.version_dir.clone(),
        layout.isolated,
        &state.io_semaphore,
        reporter,
        details,
        symlink,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loader_dependency_maps_supported_loaders() {
        assert_eq!(loader_dependency("forge"), Some(PackDependency::Forge));
        assert_eq!(
            loader_dependency("neoforge"),
            Some(PackDependency::NeoForge)
        );
        assert_eq!(
            loader_dependency("fabric"),
            Some(PackDependency::FabricLoader)
        );
        assert_eq!(
            loader_dependency("quilt"),
            Some(PackDependency::QuiltLoader)
        );
        assert_eq!(
            loader_dependency("optifine"),
            Some(PackDependency::OptiFine)
        );
        assert_eq!(
            loader_dependency("cleanroom"),
            Some(PackDependency::Cleanroom)
        );
        assert_eq!(
            loader_dependency("lite_loader"),
            Some(PackDependency::LiteLoader)
        );
        assert_eq!(
            loader_dependency("legacy_fabric"),
            Some(PackDependency::LegacyFabric)
        );
    }

    #[test]
    fn loader_dependency_rejects_unsupported_loaders() {
        for loader in ["labymod", "unknown", "vanilla"] {
            assert_eq!(loader_dependency(loader), None, "{loader}");
        }
    }

    #[tokio::test]
    async fn detect_overrides_replace_missing_detection() {
        let directory = tempfile::tempdir().unwrap();
        let overrides = ImportOverrides {
            game_version: Some("1.20.1".to_string()),
            loader: Some(ModLoader::Fabric),
            loader_version: Some("0.15.11".to_string()),
            ..Default::default()
        };

        let info = detect_instance_info(directory.path(), &overrides)
            .await
            .unwrap();

        assert_eq!(info.vanilla_name, "1.20.1");
        assert_eq!(info.loader.as_deref(), Some("fabric"));
        assert_eq!(info.loader_version.as_deref(), Some("0.15.11"));
    }

    #[tokio::test]
    async fn detect_overrides_ignore_blank_and_latest_loader_version() {
        let directory = tempfile::tempdir().unwrap();
        for loader_version in ["", "latest"] {
            let overrides = ImportOverrides {
                game_version: Some("1.20.1".to_string()),
                loader: Some(ModLoader::Fabric),
                loader_version: Some(loader_version.to_string()),
                ..Default::default()
            };

            let info = detect_instance_info(directory.path(), &overrides)
                .await
                .unwrap();

            assert_eq!(info.loader_version, None);
        }
    }

    #[tokio::test]
    async fn build_dependencies_uses_override_values() {
        let info = instance_json::InstanceInfo {
            vanilla_name: "1.20.1".to_string(),
            loader: Some("fabric".to_string()),
            loader_version: Some("0.15.11".to_string()),
            adjuncts: Vec::new(),
        };

        let dependencies = build_dependencies(&info).await.unwrap();

        assert_eq!(
            dependencies.get(&PackDependency::Minecraft),
            Some(&"1.20.1".to_string())
        );
        assert_eq!(
            dependencies.get(&PackDependency::FabricLoader),
            Some(&"0.15.11".to_string())
        );
    }

    #[tokio::test]
    async fn labymod_and_unknown_loaders_never_become_vanilla() {
        for loader in ["labymod", "unknown_loader"] {
            let info = instance_json::InstanceInfo {
                vanilla_name: "1.20.1".to_string(),
                loader: Some(loader.to_string()),
                loader_version: Some("1.0".to_string()),
                adjuncts: Vec::new(),
            };
            let error = build_dependencies(&info).await.unwrap_err();
            assert!(error.to_string().contains("Unsupported loader"));
        }
    }
}
