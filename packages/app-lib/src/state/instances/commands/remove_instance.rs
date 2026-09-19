use crate::state::State;
use crate::state::instances::adapters::sqlite::instance_rows;
use crate::state::instances::config_sync;
use crate::util::io;
use std::path::{Path, PathBuf};

pub(crate) async fn remove_instance(
    instance_id: &str,
    state: &State,
) -> crate::Result<()> {
    let _instance_lock = state.lock_instance_content(instance_id).await;

    let instance = instance_rows::get_instance_by_id(instance_id, &state.pool)
        .await?
        .ok_or_else(|| {
            crate::ErrorKind::InputError("Unknown instance".to_string())
        })?;

    // Directly associated instances have no Axolotl profile directory. Their
    // version directory is the instance itself, so removal deliberately
    // deletes the externally managed content in place. Keep the shared
    // `.minecraft` root (assets/libraries/other versions) intact.
    let path = if instance.is_direct_linked() {
        crate::launcher::DirectLinkedLaunch::from_instance(&instance)?
            .ok_or_else(|| {
                crate::ErrorKind::LauncherError(
                    "Direct instance link metadata is incomplete".to_string(),
                )
            })?
            .version_dir()
    } else if let Some(game_dir_override) = instance
        .game_dir_override
        .as_deref()
        .map(PathBuf::from)
        .filter(|path| {
            // Delete the external game directory when the instance owns it.
            // A version-isolated `versions/<name>` folder is obviously
            // exclusive; a plain `<root>/<pack name>` folder is also owned by
            // this instance. A shared `.minecraft` root, however, holds the
            // game's libraries/assets and must never be deleted with one
            // instance.
            is_version_isolated_game_dir(path)
                || !is_shared_minecraft_root(path)
        })
    {
        game_dir_override
    } else {
        state.directories.instances_dir().join(&instance.path)
    };
    if path.exists() {
        io::remove_dir_all(&path).await?;
    }

    let jobs = crate::install::store::mark_instance_deleted(instance_id, state)
        .await?;
    instance_rows::delete_instance_by_id(&instance.id, &state.pool).await?;
    config_sync::remove_config_file(&state.directories, &instance.path).await?;
    for job in jobs {
        if let Err(error) =
            crate::install::events::emit_install_job(&job.snapshot()).await
        {
            tracing::warn!(
                "Failed to emit deleted instance download state: {error}"
            );
        }
    }

    Ok(())
}

fn is_version_isolated_game_dir(path: &Path) -> bool {
    path.parent()
        .and_then(Path::file_name)
        .and_then(|name| name.to_str())
        == Some("versions")
}

/// Heuristic: a shared `.minecraft` root holds the game's libraries and
/// assets, which must survive the removal of any single instance that points
/// at it. Instance-owned external folders (e.g. a hosted modpack's
/// `<root>/<pack name>` directory) contain only mods/saves/config and no such
/// shared game body.
fn is_shared_minecraft_root(path: &Path) -> bool {
    path.join("libraries").is_dir() || path.join("assets").is_dir()
}
