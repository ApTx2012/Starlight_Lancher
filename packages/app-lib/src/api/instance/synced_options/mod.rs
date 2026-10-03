mod files;
mod game_options;
pub(in crate::api::instance) mod pending;

const COMMAND_HISTORY_FILE: &str = "command_history.txt";
const HOTBAR_FILE: &str = "hotbar.nbt";

pub(super) use self::files::{
    CheckpointStatus, begin_checkpoint, checkpoint, detach_link, ensure_link,
    finish_checkpoint, finish_plain_checkpoint, instance_game_dir,
    instance_is_running, instance_option_enabled, nbt_from_bytes, nbt_to_bytes,
    option_can_apply_while_running, read_nbt_file, safe_instance_id,
    sha1_bytes, sha1_file, sync_files_are_protected, synced_options_path,
};