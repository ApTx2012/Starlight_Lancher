use crate::state::{
    ContentSet, Hooks, Instance, InstanceLink, MemorySettings, WindowSize,
};
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize,
)]
#[serde(rename_all = "snake_case")]
pub enum InstanceMode {
    #[serde(rename = "starlight")]
    StarLight,
    #[default]
    Local,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InstancePlayer {
    pub id: uuid::Uuid,
    pub name: String,
    pub account_type: crate::state::MinecraftAccountType,
    #[serde(default)]
    pub skin_site_user: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InstanceLaunchOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player: Option<InstancePlayer>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance_mode: Option<InstanceMode>,
    pub instance_id: String,
    pub java_path: Option<String>,
    pub extra_launch_args: Option<Vec<String>>,
    pub custom_env_vars: Option<Vec<(String, String)>>,
    pub memory: Option<MemorySettings>,
    pub force_fullscreen: Option<bool>,
    pub maximize_window: Option<bool>,
    pub game_resolution: Option<WindowSize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub launch_preparation_timeout: Option<u64>,
    pub hooks: Hooks,
}

impl InstanceLaunchOverrides {
    pub fn empty(instance_id: String) -> Self {
        Self {
            player: None,
            instance_mode: None,
            instance_id,
            java_path: None,
            extra_launch_args: None,
            custom_env_vars: None,
            memory: None,
            force_fullscreen: None,
            maximize_window: None,
            game_resolution: None,
            launch_preparation_timeout: None,
            hooks: Hooks {
                pre_launch: None,
                wrapper: None,
                post_exit: None,
            },
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub(crate) struct InstanceLaunchOverridesData {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player: Option<InstancePlayer>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance_mode: Option<InstanceMode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub java_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_launch_args: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_env_vars: Option<Vec<(String, String)>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory: Option<MemorySettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub force_fullscreen: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximize_window: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub game_resolution: Option<WindowSize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub launch_preparation_timeout: Option<u64>,
    #[serde(default)]
    pub hooks: Hooks,
}

impl InstanceLaunchOverridesData {
    pub(crate) fn into_launch_overrides(
        self,
        instance_id: String,
    ) -> InstanceLaunchOverrides {
        InstanceLaunchOverrides {
            player: self.player,
            instance_mode: self.instance_mode,
            instance_id,
            java_path: self.java_path,
            extra_launch_args: self.extra_launch_args,
            custom_env_vars: self.custom_env_vars,
            memory: self.memory,
            force_fullscreen: self.force_fullscreen,
            maximize_window: self.maximize_window,
            game_resolution: self.game_resolution,
            launch_preparation_timeout: self.launch_preparation_timeout,
            hooks: self.hooks,
        }
    }
}

impl From<&InstanceLaunchOverrides> for InstanceLaunchOverridesData {
    fn from(overrides: &InstanceLaunchOverrides) -> Self {
        Self {
            player: overrides.player.clone(),
            instance_mode: overrides.instance_mode,
            java_path: overrides.java_path.clone(),
            extra_launch_args: overrides.extra_launch_args.clone(),
            custom_env_vars: overrides.custom_env_vars.clone(),
            memory: overrides.memory,
            force_fullscreen: overrides.force_fullscreen,
            maximize_window: overrides.maximize_window,
            game_resolution: overrides.game_resolution,
            launch_preparation_timeout: overrides.launch_preparation_timeout,
            hooks: overrides.hooks.clone(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InstanceLaunchContext {
    pub instance: Instance,
    pub applied_content_set: ContentSet,
    pub link: InstanceLink,
    pub launch_overrides: InstanceLaunchOverrides,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn instance_mode_round_trips_with_saved_launch_configuration() {
        let mut original = InstanceLaunchOverrides::empty("instance".into());
        for mode in [InstanceMode::StarLight, InstanceMode::Local] {
            original.instance_mode = Some(mode);
            let encoded = serde_json::to_string(
                &InstanceLaunchOverridesData::from(&original),
            )
            .unwrap();
            let decoded: InstanceLaunchOverridesData =
                serde_json::from_str(&encoded).unwrap();
            assert_eq!(
                decoded
                    .into_launch_overrides("instance".into())
                    .instance_mode,
                Some(mode)
            );
        }
        let old: InstanceLaunchOverridesData =
            serde_json::from_str("{}").unwrap();
        assert_eq!(old.instance_mode, None);
        assert_eq!(
            serde_json::to_string(&InstanceMode::StarLight).unwrap(),
            "\"starlight\""
        );
        assert!(serde_json::from_str::<InstanceMode>("\"invalid\"").is_err());
    }

    #[test]
    fn instance_player_survives_configuration_round_trip() {
        let mut original = InstanceLaunchOverrides::empty("one".into());
        let id = uuid::Uuid::new_v4();
        original.player = Some(InstancePlayer {
            id,
            name: "SavedPlayer".into(),
            account_type: crate::state::MinecraftAccountType::Yggdrasil,
            skin_site_user: Some("owner".into()),
        });
        let encoded = serde_json::to_string(
            &InstanceLaunchOverridesData::from(&original),
        )
        .unwrap();
        let decoded: InstanceLaunchOverridesData =
            serde_json::from_str(&encoded).unwrap();
        let saved = decoded.into_launch_overrides("one".into()).player.unwrap();
        assert_eq!(saved.id, id);
        assert_eq!(saved.skin_site_user.as_deref(), Some("owner"));
        assert_eq!(
            saved.account_type,
            crate::state::MinecraftAccountType::Yggdrasil
        );
        assert!(
            serde_json::from_str::<InstanceLaunchOverridesData>("{}")
                .unwrap()
                .player
                .is_none()
        );
    }
}
