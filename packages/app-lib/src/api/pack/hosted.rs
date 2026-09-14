//! Administrator-approved skin-site packs. Only content-addressed changed files cross the network.
use crate::{
    State,
    state::{
        AppliedContentSetPatch, EditInstance, InstanceInstallStage,
        InstanceLaunchOverridesPatch, InstanceMode, ModLoader,
    },
    util::fetch::{
        DownloadRequest, Integrity, ResourceClass, download_to_path, fetch_json,
    },
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
    sync::{Arc, LazyLock},
};
use tokio::{
    io::AsyncReadExt,
    sync::{Mutex, OwnedMutexGuard},
};

const API: &str = "https://skin.starlight.cool/starlight/mod/packs";
const BINDING: &str = ".starlight-pack.json";
const JOURNAL: &str = ".starlight-pack-pending.json";
static GATES: LazyLock<dashmap::DashMap<String, Arc<Mutex<()>>>> =
    LazyLock::new(dashmap::DashMap::new);

fn instance_gate(instance_id: &str) -> Arc<Mutex<()>> {
    GATES.entry(instance_id.to_owned()).or_default().clone()
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Runtime {
    pub game_version: String,
    pub loader: String,
    pub loader_version: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackFile {
    pub path: String,
    pub sha256: String,
    pub size: u64,
    #[serde(default)]
    pub force: bool,
    #[serde(default)]
    pub preserve: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct External {
    pub project_id: u32,
    pub file_id: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub schema_version: u32,
    pub name: String,
    pub version: String,
    pub format: String,
    pub runtime: Runtime,
    pub files: Vec<PackFile>,
    #[serde(default)]
    pub external: Vec<External>,
    #[serde(default)]
    pub java_arguments: Vec<String>,
    #[serde(default)]
    pub game_arguments: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Publication {
    pub pack_id: String,
    pub release_id: u64,
    pub manifest: Manifest,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Binding {
    pub publication: Publication,
    pub files: Vec<PackFile>,
}
#[derive(Deserialize)]
struct Response<T> {
    payload: T,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub instance_id: String,
    pub version: String,
    pub downloaded_bytes: u64,
    pub changed_files: usize,
    pub preserved_files: Vec<String>,
}

fn invalid(message: impl Into<String>) -> crate::Error {
    crate::ErrorKind::InputError(message.into()).into()
}
fn safe_path(path: &str) -> crate::Result<()> {
    if path.is_empty()
        || path.len() > 1024
        || path.contains('\\')
        || path.to_ascii_lowercase().starts_with(".starlight-")
        || path.split('/').any(|part| {
            let stem =
                part.split('.').next().unwrap_or("").to_ascii_lowercase();
            part.is_empty()
                || part == "."
                || part == ".."
                || part.ends_with(['.', ' '])
                || part
                    .chars()
                    .any(|c| c.is_control() || ":*?\"<>|".contains(c))
                || matches!(stem.as_str(), "con" | "prn" | "aux" | "nul")
                || (stem.len() == 4
                    && (stem.starts_with("com") || stem.starts_with("lpt"))
                    && matches!(stem.as_bytes()[3], b'1'..=b'9'))
        })
    {
        return Err(invalid(format!("Unsafe modpack path: {path}")));
    }
    Ok(())
}
fn validate(files: &[PackFile]) -> crate::Result<()> {
    if files.iter().map(|f| u128::from(f.size)).sum::<u128>()
        > 16 * 1024 * 1024 * 1024
        || files.len() > 100_000
    {
        return Err(invalid("Modpack has too many files"));
    }
    let mut paths = HashSet::new();
    for f in files {
        safe_path(&f.path)?;
        if f.sha256.len() != 64
            || !f
                .sha256
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
            || f.size > 2 * 1024 * 1024 * 1024
            || !paths.insert(f.path.to_lowercase())
        {
            return Err(invalid(
                "Invalid hash, size or duplicate modpack path",
            ));
        }
    }
    for f in files {
        let mut p = Path::new(&f.path).parent();
        while let Some(parent) = p {
            if paths.contains(
                &parent.to_string_lossy().replace('\\', "/").to_lowercase(),
            ) {
                return Err(invalid("Modpack file/directory conflict"));
            }
            p = parent.parent();
        }
    }
    Ok(())
}
/// Reject symlinks and junctions in every existing ancestor, including internal state files.
fn target(root: &Path, relative: &str) -> crate::Result<PathBuf> {
    let mut path = root.to_path_buf();
    for part in relative.split('/') {
        path.push(part);
        match std::fs::symlink_metadata(&path) {
            Ok(meta) => {
                #[cfg(windows)]
                {
                    use std::os::windows::fs::MetadataExt;
                    if meta.file_attributes() & 0x400 != 0 {
                        return Err(invalid(
                            "Modpack path is a junction or symlink",
                        ));
                    }
                }
                if meta.file_type().is_symlink() {
                    return Err(invalid("Modpack path is a symlink"));
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => return Err(e.into()),
        }
    }
    Ok(path)
}
async fn hash(path: &Path) -> crate::Result<Option<String>> {
    let mut input = match tokio::fs::File::open(path).await {
        Ok(f) => f,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.into()),
    };
    let mut digest = Sha256::new();
    let mut buffer = vec![0; 64 * 1024];
    loop {
        let n = input.read(&mut buffer).await?;
        if n == 0 {
            break;
        }
        digest.update(&buffer[..n]);
    }
    Ok(Some(format!("{:x}", digest.finalize())))
}
async fn read_json<T: serde::de::DeserializeOwned>(
    root: &Path,
    name: &str,
) -> crate::Result<Option<T>> {
    match tokio::fs::read(target(root, name)?).await {
        Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}
fn write_json<T: Serialize>(
    root: &Path,
    name: &str,
    value: &T,
) -> crate::Result<()> {
    use std::io::Write;
    let dest = target(root, name)?;
    let mut file = tempfile::NamedTempFile::new_in(root)?;
    file.write_all(&serde_json::to_vec(value)?)?;
    file.as_file().sync_all()?;
    file.persist(dest).map_err(|e| e.error)?;
    Ok(())
}
async fn request<T: serde::de::DeserializeOwned>(
    suffix: &str,
) -> crate::Result<T> {
    let state = State::get().await?;
    let response: Response<T> = fetch_json(
        reqwest::Method::GET,
        &format!("{API}{suffix}"),
        None,
        None,
        None,
        &state.api_semaphore,
        &state.pool,
    )
    .await?;
    Ok(response.payload)
}
pub async fn catalog() -> crate::Result<Vec<Publication>> {
    request("").await
}
pub async fn binding(instance_id: &str) -> crate::Result<Option<Binding>> {
    read_json(&crate::instance::get_full_path(instance_id).await?, BINDING)
        .await
}
pub async fn java_arguments(instance_id: &str) -> crate::Result<Vec<String>> {
    Ok(binding(instance_id)
        .await?
        .map(|b| b.publication.manifest.java_arguments)
        .unwrap_or_default())
}
pub async fn game_arguments(instance_id: &str) -> crate::Result<Vec<String>> {
    Ok(binding(instance_id)
        .await?
        .map(|b| b.publication.manifest.game_arguments)
        .unwrap_or_default())
}

#[derive(Serialize, Deserialize)]
struct Action {
    path: String,
    old_hash: Option<String>,
    next_hash: Option<String>,
}
#[derive(Serialize, Deserialize)]
struct Journal {
    backup: String,
    actions: Vec<Action>,
    previous: Option<Binding>,
    metadata: crate::state::InstanceMetadata,
}

async fn apply_files(
    root: &Path,
    cache: &Path,
    backup_dir: &str,
    actions: &[Action],
) -> crate::Result<()> {
    for action in actions {
        let live = target(root, &action.path)?;
        if hash(&live).await? != action.old_hash {
            return Err(invalid(format!(
                "File changed during sync: {}",
                action.path
            )));
        }
        if action.old_hash.is_some() {
            let backup =
                target(root, &format!("{}/{}", backup_dir, action.path))?;
            tokio::fs::create_dir_all(backup.parent().unwrap()).await?;
            tokio::fs::rename(&live, backup).await?;
        }
        if let Some(next) = &action.next_hash {
            tokio::fs::create_dir_all(live.parent().unwrap()).await?;
            let staged =
                tempfile::NamedTempFile::new_in(live.parent().unwrap())?;
            tokio::fs::copy(target(cache, next)?, staged.path()).await?;
            staged.as_file().sync_all()?;
            staged.persist(&live).map_err(|e| e.error)?;
        }
    }
    Ok(())
}

async fn restore_files(
    root: &Path,
    backup_dir: &str,
    actions: &[Action],
) -> crate::Result<()> {
    // A durable journal is written before touching live files; it also recovers interrupted runs.
    if !backup_dir.starts_with(".starlight-pack-backup-")
        || backup_dir.contains(['/', '\\'])
    {
        return Err(invalid("Invalid modpack recovery directory"));
    }
    for action in actions.iter().rev() {
        safe_path(&action.path)?;
        let live = target(root, &action.path)?;
        let backup = target(root, &format!("{}/{}", backup_dir, action.path))?;
        if backup.is_file() {
            if live.exists() {
                tokio::fs::remove_file(&live).await?;
            }
            tokio::fs::create_dir_all(live.parent().unwrap()).await?;
            tokio::fs::rename(backup, live).await?;
        } else if action.old_hash.is_none()
            && action.next_hash.is_some()
            && hash(&live).await? == action.next_hash
        {
            tokio::fs::remove_file(live).await?;
        }
    }
    Ok(())
}

async fn restore(root: &Path, journal: &Journal) -> crate::Result<()> {
    restore_files(root, &journal.backup, &journal.actions).await?;
    let state = State::get().await?;
    crate::state::instances::commands::restore_instance_metadata(
        &journal.metadata,
        &state.pool,
    )
    .await?;
    if let Some(old) = &journal.previous {
        write_json(root, BINDING, old)?;
    } else if target(root, BINDING)?.exists() {
        tokio::fs::remove_file(target(root, BINDING)?).await?;
    }
    tokio::fs::remove_file(target(root, JOURNAL)?).await?;
    Ok(())
}
async fn ensure_idle(instance_id: &str) -> crate::Result<()> {
    if !crate::process::get_by_instance_id(instance_id)
        .await?
        .is_empty()
    {
        return Err(invalid(
            "Close Minecraft before synchronizing its modpack",
        ));
    }
    if crate::install::list_jobs(false).await?.iter().any(|job| {
        job.instance_id.as_deref() == Some(instance_id)
            && matches!(
                job.status,
                crate::install::InstallJobStatus::Running
                    | crate::install::InstallJobStatus::Canceling
                    | crate::install::InstallJobStatus::Queued
                    | crate::install::InstallJobStatus::WaitingForUser
            )
    }) {
        return Err(invalid("An installation is already using this instance"));
    }
    Ok(())
}
async fn recover(instance_id: &str) -> crate::Result<()> {
    let root = crate::instance::get_full_path(instance_id).await?;
    if let Some(journal) = read_json::<Journal>(&root, JOURNAL).await? {
        if journal.metadata.instance.id != instance_id {
            return Err(invalid(
                "Recovery journal belongs to another instance",
            ));
        }
        ensure_idle(instance_id).await?;
        restore(&root, &journal).await?;
    }
    Ok(())
}

pub async fn synchronize(
    instance_id: &str,
    pack_id: &str,
) -> crate::Result<SyncResult> {
    let _guard = instance_gate(instance_id).lock_owned().await;
    if instance_mode(instance_id).await? != InstanceMode::StarLight {
        return Err(invalid(
            "请先将实例类型设为 StarLight 实例，再同步官方整合包",
        ));
    }
    synchronize_locked(instance_id, pack_id).await
}

fn effective_mode(
    explicit: Option<InstanceMode>,
    has_binding: bool,
) -> InstanceMode {
    explicit.unwrap_or(if has_binding {
        InstanceMode::StarLight
    } else {
        InstanceMode::Local
    })
}

pub async fn instance_mode(instance_id: &str) -> crate::Result<InstanceMode> {
    let metadata = crate::instance::get(instance_id)
        .await?
        .ok_or_else(|| invalid("Unknown instance"))?;
    if let Some(mode) = metadata.launch_overrides.instance_mode {
        return Ok(mode);
    }
    Ok(effective_mode(None, binding(instance_id).await?.is_some()))
}

pub async fn set_instance_mode(
    instance_id: &str,
    mode: InstanceMode,
) -> crate::Result<()> {
    let _guard = instance_gate(instance_id).lock_owned().await;
    ensure_idle(instance_id).await?;
    recover(instance_id).await?;
    let metadata = crate::instance::get(instance_id)
        .await?
        .ok_or_else(|| invalid("Unknown instance"))?;
    if mode == InstanceMode::StarLight
        && (metadata.instance.linked_launcher.is_some()
            || metadata.instance.symlink_target.is_some()
            || !matches!(
                metadata.link,
                crate::state::InstanceLink::Unmanaged
                    | crate::state::InstanceLink::ImportedModpack { .. }
            ))
    {
        return Err(invalid(
            "外部关联、共享目录或由第三方整合包平台管理的实例不能开启 StarLight 自动同步，请创建独立实例",
        ));
    }
    crate::instance::edit(
        instance_id,
        EditInstance {
            launch_overrides: Some(InstanceLaunchOverridesPatch {
                instance_mode: Some(mode),
                ..Default::default()
            }),
            ..Default::default()
        },
    )
    .await?;
    Ok(())
}
/// Held through process creation so a manual sync cannot race a launch.
pub async fn prepare_launch(
    instance_id: &str,
    offline: bool,
) -> crate::Result<OwnedMutexGuard<()>> {
    let guard = instance_gate(instance_id).lock_owned().await;
    recover(instance_id).await?;
    if instance_mode(instance_id).await? == InstanceMode::StarLight {
        let b = binding(instance_id).await?.ok_or_else(|| invalid("StarLight 实例尚未配置官方整合包，请在 Mod 管理 → 管理整合包中选择并安装后再启动"))?;
        if !offline {
            synchronize_locked(instance_id, &b.publication.pack_id).await?;
        }
    }
    Ok(guard)
}

async fn synchronize_locked(
    instance_id: &str,
    pack_id: &str,
) -> crate::Result<SyncResult> {
    uuid::Uuid::parse_str(pack_id)
        .map_err(|_| invalid("Invalid modpack ID"))?;
    ensure_idle(instance_id).await?;
    recover(instance_id).await?;
    let metadata = crate::instance::get(instance_id)
        .await?
        .ok_or_else(|| invalid("Unknown instance"))?;
    if metadata.instance.linked_launcher.is_some()
        || metadata.instance.symlink_target.is_some()
        || !matches!(
            metadata.link,
            crate::state::InstanceLink::Unmanaged
                | crate::state::InstanceLink::ImportedModpack { .. }
        )
    {
        return Err(invalid(
            "Hosted modpacks require a launcher-managed instance",
        ));
    }
    let root = crate::instance::get_full_path(instance_id).await?;
    let previous: Option<Binding> = read_json(&root, BINDING).await?;
    if previous
        .as_ref()
        .is_some_and(|b| b.publication.pack_id != pack_id)
    {
        return Err(invalid(
            "This instance is bound to another modpack; create a separate instance",
        ));
    }
    let publication: Publication = request(&format!("/{pack_id}")).await?;
    if publication.pack_id != pack_id
        || publication.manifest.schema_version != 1
    {
        return Err(invalid("Invalid modpack publication"));
    }
    if previous
        .as_ref()
        .is_some_and(|b| b.publication.release_id > publication.release_id)
    {
        return Err(invalid("Server returned an older modpack publication"));
    }
    let manifest = &publication.manifest;
    let loader = ModLoader::try_from_string(&manifest.runtime.loader)?;
    let resolved_loader = if loader == ModLoader::Vanilla {
        None
    } else {
        Some(crate::launcher::get_loader_version_from_profile(&manifest.runtime.game_version, loader, manifest.runtime.loader_version.as_deref()).await?.ok_or_else(|| invalid("Modpack loader version is unavailable for this Minecraft version"))?.id)
    };
    let runtime_changed = metadata.applied_content_set.game_version
        != manifest.runtime.game_version
        || metadata.applied_content_set.loader != loader
        || metadata.applied_content_set.loader_version != resolved_loader;

    let cache = target(&root, ".starlight-pack-cache")?;
    tokio::fs::create_dir_all(&cache).await?;
    let state = State::get().await?;
    let mut files = manifest.files.clone();
    validate(&files)?;
    let mut downloaded = 0;
    let mut sources = BTreeMap::new();
    for f in &files {
        sources.insert(
            f.path.clone(),
            format!("{API}/files/{}/{}", publication.release_id, f.sha256),
        );
    }
    // Resolve CurseForge references using the launcher's existing API and integrity checks.
    for external in &manifest.external {
        let cf = crate::api::curseforge::get_file(
            external.project_id,
            external.file_id,
        )
        .await?;
        if cf.mod_id != external.project_id || cf.id != external.file_id {
            return Err(invalid("CurseForge returned a mismatched file"));
        }
        safe_path(&cf.file_name)?;
        if cf.file_name.contains('/') {
            return Err(invalid("Invalid CurseForge filename"));
        }
        let path = format!("mods/{}", cf.file_name);
        if files.iter().any(|f| f.path.eq_ignore_ascii_case(&path)) {
            continue;
        } // overrides take precedence
        let sha1 = cf
            .hashes
            .iter()
            .find(|h| h.algo == 1)
            .map(|h| h.value.clone())
            .ok_or_else(|| invalid("CurseForge file has no SHA-1"))?;
        let staged = target(
            &cache,
            &format!("cf-{}-{}", external.project_id, external.file_id),
        )?;
        let local = target(&root, &path)?;
        if !staged.exists()
            && local.is_file()
            && crate::util::fetch::sha1_file_async(&local).await?
                == (cf.file_length, sha1.clone())
        {
            tokio::fs::copy(&local, &staged).await?;
        }
        if !staged.exists() {
            let url = match cf.download_url {
                Some(url) => url,
                None => crate::api::curseforge::get_download_url(
                    external.project_id,
                    external.file_id,
                )
                .await?
                .ok_or_else(|| {
                    invalid("This CurseForge file requires a manual download")
                })?,
            };
            download_to_path(
                DownloadRequest::new(url, ResourceClass::CurseForge)
                    .with_integrity(
                        Integrity::sha1(sha1.clone()).with_size(cf.file_length),
                    ),
                &staged,
                &state.fetch_semaphore,
                &state.pool,
                None,
            )
            .await?;
            downloaded += cf.file_length;
        } else if crate::util::fetch::sha1_file_async(&staged).await?
            != (cf.file_length, sha1)
        {
            return Err(invalid("Cached CurseForge file failed verification"));
        }
        let sha256 = hash(&staged)
            .await?
            .ok_or_else(|| invalid("CurseForge download is missing"))?;
        let object = target(&cache, &sha256)?;
        if !object.exists() {
            tokio::fs::copy(&staged, object).await?;
        }
        files.push(PackFile {
            path,
            sha256,
            size: cf.file_length,
            force: true,
            preserve: false,
        });
    }
    validate(&files)?;
    if let Some(old) = &previous {
        validate(&old.files)?;
    }
    let old: BTreeMap<_, _> = previous
        .as_ref()
        .map(|b| b.files.iter().map(|f| (f.path.as_str(), f)).collect())
        .unwrap_or_default();
    let mut actions = Vec::new();
    let mut preserved = Vec::new();
    let next_paths: BTreeMap<_, _> = files
        .iter()
        .map(|f| (f.path.to_ascii_lowercase(), f.path.as_str()))
        .collect();
    for prior in old.values() {
        if next_paths
            .get(&prior.path.to_ascii_lowercase())
            .is_some_and(|next| **next != prior.path)
        {
            return Err(invalid(
                "Case-only filename changes require a new instance",
            ));
        }
    }
    for f in &files {
        let live = target(&root, &f.path)?;
        let local = hash(&live).await?;
        if local.as_deref() == Some(&f.sha256) {
            continue;
        }
        let prior = old.get(f.path.as_str());
        if local.is_some()
            && (f.preserve
                || (!f.force
                    && prior
                        .is_some_and(|p| local.as_deref() != Some(&p.sha256))))
        {
            preserved.push(f.path.clone());
            continue;
        }
        if previous.is_none() && local.is_some() {
            return Err(invalid(format!(
                "Existing file conflicts with the modpack: {}. Use an empty instance.",
                f.path
            )));
        }
        let object = target(&cache, &f.sha256)?;
        if hash(&object).await?.as_deref() != Some(&f.sha256) {
            let url = sources
                .get(&f.path)
                .ok_or_else(|| invalid("Missing modpack download source"))?;
            download_to_path(
                DownloadRequest::new(url, ResourceClass::Modpack)
                    .with_integrity(Integrity {
                        size: Some(f.size),
                        sha256: Some(f.sha256.clone()),
                        ..Default::default()
                    }),
                &object,
                &state.fetch_semaphore,
                &state.pool,
                None,
            )
            .await?;
            downloaded += f.size;
        }
        actions.push(Action {
            path: f.path.clone(),
            old_hash: local,
            next_hash: Some(f.sha256.clone()),
        });
    }
    for prior in old.values() {
        if !next_paths.contains_key(&prior.path.to_ascii_lowercase()) {
            let local = hash(&target(&root, &prior.path)?).await?;
            if local.is_none() {
                continue;
            }
            if prior.preserve || local.as_deref() != Some(&prior.sha256) {
                preserved.push(prior.path.clone());
                continue;
            }
            actions.push(Action {
                path: prior.path.clone(),
                old_hash: local,
                next_hash: None,
            });
        }
    }
    if actions.is_empty()
        && !runtime_changed
        && metadata.instance.install_stage == InstanceInstallStage::Installed
        && previous
            .as_ref()
            .is_some_and(|b| b.publication.release_id == publication.release_id)
    {
        return Ok(SyncResult {
            instance_id: instance_id.into(),
            version: manifest.version.clone(),
            downloaded_bytes: downloaded,
            changed_files: 0,
            preserved_files: preserved,
        });
    }
    let journal = Journal {
        backup: format!(".starlight-pack-backup-{}", uuid::Uuid::new_v4()),
        actions,
        previous,
        metadata,
    };
    write_json(&root, JOURNAL, &journal)?;
    let result = async {
        // Stage all content before changing the game/runtime. The journal blocks launch until recovery.
        crate::instance::edit(instance_id, EditInstance {
            install_stage: Some(InstanceInstallStage::PackInstalling),
            content_set_patch: Some(AppliedContentSetPatch { game_version: Some(manifest.runtime.game_version.clone()), loader: Some(loader), loader_version: Some(resolved_loader.clone()), ..Default::default() }),
            ..Default::default()
        }).await?;
        if runtime_changed || journal.metadata.instance.install_stage != InstanceInstallStage::Installed {
            let mut job = crate::install::install_existing_instance(instance_id.to_string(), false).await?;
            loop {
                use crate::install::InstallJobStatus::*;
                match job.status {
                    Succeeded => break,
                    Queued | Running => { tokio::time::sleep(std::time::Duration::from_millis(250)).await; job = crate::install::get_job(job.job_id).await?; }
                    _ => { let _ = crate::install::cancel_job(job.job_id).await; return Err(invalid("Minecraft component installation did not finish; inspect Downloads and retry")); }
                }
            }
        }
        apply_files(&root, &cache, &journal.backup, &journal.actions).await?;
        write_json(&root, BINDING, &Binding { publication: publication.clone(), files })?;
        crate::instance::edit(instance_id, EditInstance { install_stage: Some(InstanceInstallStage::Installed), ..Default::default() }).await?;
        crate::instance::sync_content_files(instance_id).await?;
        tokio::fs::remove_file(target(&root, JOURNAL)?).await?;
        Ok::<_, crate::Error>(())
    }.await;
    if let Err(error) = result {
        ensure_idle(instance_id).await.map_err(|busy| invalid(format!("Sync failed: {error}; recovery is pending until the active installation stops: {busy}")))?;
        restore(&root, &journal).await.map_err(|recovery| invalid(format!("Sync failed: {error}; recovery failed: {recovery}. Retry before launching.")))?;
        return Err(error);
    }
    Ok(SyncResult {
        instance_id: instance_id.to_string(),
        version: publication.manifest.version,
        downloaded_bytes: downloaded,
        changed_files: journal.actions.len(),
        preserved_files: preserved,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn instance_operations_exclude_each_other_without_blocking_other_instances()
     {
        let first = instance_gate("mode-test-first");
        let held = first.lock_owned().await;
        assert!(instance_gate("mode-test-first").try_lock_owned().is_err());
        assert!(instance_gate("mode-test-second").try_lock_owned().is_ok());
        drop(held);
        assert!(instance_gate("mode-test-first").try_lock_owned().is_ok());
    }
    #[test]
    fn explicit_local_disables_legacy_binding_sync() {
        assert_eq!(effective_mode(None, false), InstanceMode::Local);
        assert_eq!(effective_mode(None, true), InstanceMode::StarLight);
        assert_eq!(
            effective_mode(Some(InstanceMode::Local), true),
            InstanceMode::Local
        );
        assert_eq!(
            effective_mode(Some(InstanceMode::StarLight), false),
            InstanceMode::StarLight
        );
    }
    #[tokio::test]
    async fn partial_update_recovers_modified_added_and_removed_files() {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path();
        let cache = root.join(".starlight-pack-cache");
        std::fs::create_dir_all(&cache).unwrap();
        std::fs::write(root.join("old.jar"), b"old").unwrap();
        std::fs::write(root.join("removed.jar"), b"removed").unwrap();
        std::fs::write(cache.join("next"), b"next").unwrap();
        let next = hash(&cache.join("next")).await.unwrap().unwrap();
        std::fs::rename(cache.join("next"), cache.join(&next)).unwrap();
        let actions = vec![
            Action {
                path: "old.jar".into(),
                old_hash: hash(&root.join("old.jar")).await.unwrap(),
                next_hash: Some(next.clone()),
            },
            Action {
                path: "new.jar".into(),
                old_hash: None,
                next_hash: Some(next.clone()),
            },
            Action {
                path: "removed.jar".into(),
                old_hash: hash(&root.join("removed.jar")).await.unwrap(),
                next_hash: None,
            },
            Action {
                path: "missing.jar".into(),
                old_hash: None,
                next_hash: Some("0".repeat(64)),
            },
        ];
        let backup = ".starlight-pack-backup-test";
        assert!(apply_files(root, &cache, backup, &actions).await.is_err());
        assert_eq!(hash(&root.join("old.jar")).await.unwrap(), Some(next));
        assert!(!root.join("removed.jar").exists());
        restore_files(root, backup, &actions).await.unwrap();
        assert_eq!(std::fs::read(root.join("old.jar")).unwrap(), b"old");
        assert_eq!(
            std::fs::read(root.join("removed.jar")).unwrap(),
            b"removed"
        );
        assert!(!root.join("new.jar").exists());
        assert!(!root.join("missing.jar").exists());
        restore_files(root, backup, &actions).await.unwrap();
    }
    #[test]
    fn rejects_cross_platform_escape_paths() {
        for path in [
            "../mods/a",
            "/mods/a",
            "C:/a",
            "mods\\a",
            "mods/NUL.jar",
            "mods/a.",
            "mods//a",
            ".starlight-pack.json",
        ] {
            assert!(safe_path(path).is_err(), "{path}");
        }
        assert!(safe_path("mods/中文.jar").is_ok());
    }
    #[test]
    fn rejects_case_and_ancestor_collisions() {
        let make = |p: &str| PackFile {
            path: p.into(),
            sha256: "a".repeat(64),
            size: 1,
            force: true,
            preserve: false,
        };
        assert!(validate(&[make("mods/a.jar"), make("mods/A.jar")]).is_err());
        assert!(validate(&[make("config/a"), make("config/a/b")]).is_err());
    }
}
