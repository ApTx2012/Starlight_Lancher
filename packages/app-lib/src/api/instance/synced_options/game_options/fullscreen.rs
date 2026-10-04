//! Keeps the app-wide fullscreen setting aligned with the shared Minecraft value.

use super::CATALOG_REVISION;
use crate::state::{
    CanonicalValue, State, load_game_option_preferences,
    load_game_options_sync_state, load_shared_game_options,
};
use chrono::Utc;
use sqlx::{Sqlite, Transaction};

const FULLSCREEN_OPTION_ID: &str = "fullscreen";

pub(crate) async fn shared_fullscreen_value(
    state: &State,
) -> crate::Result<Option<bool>> {
    let preferences = load_game_option_preferences(&state.pool).await?;
    if !preferences
        .get(FULLSCREEN_OPTION_ID)
        .is_some_and(|preference| preference.enabled)
    {
        return Ok(None);
    }
    let values = load_shared_game_options(&state.pool).await?;
    Ok(values.get(FULLSCREEN_OPTION_ID).and_then(|stored| {
        if !stored.seeded {
            return None;
        }
        match stored.value.as_ref() {
            Some(CanonicalValue::Bool(value)) => Some(*value),
            _ => None,
        }
    }))
}

pub(crate) async fn update_shared_fullscreen_from_app(
    state: &State,
    value: bool,
) -> crate::Result<bool> {
    let values = load_shared_game_options(&state.pool).await?;
    let preferences = load_game_option_preferences(&state.pool).await?;
    let stored = values.get(FULLSCREEN_OPTION_ID);
    let preference = preferences.get(FULLSCREEN_OPTION_ID);
    let value_matches = stored.is_some_and(|stored| {
        stored.seeded
            && matches!(
                stored.value.as_ref(),
                Some(CanonicalValue::Bool(current)) if *current == value
            )
    });
    let sync_enabled = preference.is_some_and(|preference| preference.enabled);
    if !sync_enabled || value_matches {
        return Ok(false);
    }

    let option_revision = stored
        .map(|stored| stored.revision)
        .unwrap_or(0)
        .max(
            preference
                .map(|preference| preference.revision)
                .unwrap_or(0),
        )
        .saturating_add(1) as i64;
    let (canonical_revision, _) =
        load_game_options_sync_state(&state.pool, CATALOG_REVISION).await?;
    let next_canonical_revision = canonical_revision.saturating_add(1) as i64;
    let canonical = CanonicalValue::Bool(value);
    let value_json = serde_json::to_string(&canonical)?;
    let canonical_type = canonical.type_name();
    let now = Utc::now().timestamp();
    let catalog_revision = CATALOG_REVISION as i64;
    let kind = "vanilla";
    let raw_key: Option<&str> = None;
    let value_codec = "catalog";
    let source_game_version: Option<&str> = None;
    let mut tx = state.pool.begin().await?;

    sqlx::query(
        "INSERT INTO synced_game_option_values
            (option_id, kind, raw_key, canonical_type,
             canonical_value_json, value_codec, seeded, revision, origin,
             source_game_version, source_instance_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'app_editor', ?, NULL, ?)
        ON CONFLICT(option_id) DO UPDATE SET
            kind = excluded.kind, raw_key = excluded.raw_key,
            canonical_type = excluded.canonical_type,
            canonical_value_json = excluded.canonical_value_json,
            value_codec = excluded.value_codec, seeded = 1,
            revision = excluded.revision, origin = 'app_editor',
            source_game_version = NULL, source_instance_id = NULL,
            updated_at = excluded.updated_at",
    )
    .bind(FULLSCREEN_OPTION_ID)
    .bind(kind)
    .bind(raw_key)
    .bind(canonical_type)
    .bind(value_json)
    .bind(value_codec)
    .bind(option_revision)
    .bind(source_game_version)
    .bind(now)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO synced_game_option_preferences
            (option_id, enabled, source, revision)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(option_id) DO UPDATE SET
            enabled = excluded.enabled, source = 'user',
            revision = excluded.revision",
    )
    .bind(FULLSCREEN_OPTION_ID)
    .bind(true)
    .bind("user")
    .bind(option_revision)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO synced_game_option_state (singleton, revision, catalog_revision)
        VALUES (1, ?, ?)
        ON CONFLICT(singleton) DO UPDATE SET
            revision = excluded.revision,
            catalog_revision = excluded.catalog_revision",
    )
    .bind(next_canonical_revision)
    .bind(catalog_revision)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(true)
}

pub(super) async fn update_app_fullscreen_setting(
    tx: &mut Transaction<'_, Sqlite>,
    value: &CanonicalValue,
    sync_enabled: bool,
) -> crate::Result<()> {
    if !sync_enabled {
        return Ok(());
    }
    let CanonicalValue::Bool(value) = value else {
        return Ok(());
    };
    sqlx::query("UPDATE settings SET mc_force_fullscreen = ? WHERE id = 0")
        .bind(*value)
        .execute(&mut **tx)
        .await?;
    Ok(())
}
