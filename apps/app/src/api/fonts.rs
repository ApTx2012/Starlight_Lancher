use serde::Serialize;
use std::collections::HashMap;
use std::sync::OnceLock;

use crate::api::Result;

#[derive(Debug, Clone, Serialize)]
pub struct SystemFontFamily {
    pub family: String,
    pub monospaced: bool,
}

/// Scanning every installed face costs a few hundred milliseconds, and the
/// collection only changes between sessions, so it is read once per process.
static SYSTEM_FONTS: OnceLock<Vec<SystemFontFamily>> = OnceLock::new();

type FontFamilies = [(String, fontdb::Language)];

/// fontdb lists the English US family first when the font has one, but the
/// lookup is explicit so a face with an unusual name table still resolves to
/// the name the webview matches against.
fn english_family_name(families: &FontFamilies) -> Option<&str> {
    families
        .iter()
        .find(|(_, language)| {
            *language == fontdb::Language::English_UnitedStates
        })
        .or_else(|| families.first())
        .map(|(name, _)| name.trim())
        .filter(|name| !name.is_empty())
}

#[derive(Default)]
struct FamilyAccumulator {
    families: HashMap<String, bool>,
}

impl FamilyAccumulator {
    fn add(&mut self, families: &FontFamilies, monospaced: bool) {
        let Some(name) = english_family_name(families) else {
            return;
        };

        self.families
            .entry(name.to_owned())
            .and_modify(|flag| *flag |= monospaced)
            .or_insert(monospaced);
    }

    fn into_sorted_families(self) -> Vec<SystemFontFamily> {
        let mut families: Vec<SystemFontFamily> = self
            .families
            .into_iter()
            .map(|(family, monospaced)| SystemFontFamily { family, monospaced })
            .collect();
        families.sort_by_cached_key(|entry| entry.family.to_lowercase());
        families
    }
}

fn collect_system_fonts() -> Vec<SystemFontFamily> {
    let mut database = fontdb::Database::new();
    database.load_system_fonts();

    let mut accumulator = FamilyAccumulator::default();
    for face in database.faces() {
        accumulator.add(&face.families, face.monospaced);
    }

    accumulator.into_sorted_families()
}

#[tauri::command]
pub async fn fonts_get_system_fonts() -> Result<Vec<SystemFontFamily>> {
    if let Some(fonts) = SYSTEM_FONTS.get() {
        return Ok(fonts.clone());
    }

    let fonts = tauri::async_runtime::spawn_blocking(collect_system_fonts)
        .await
        .map_err(std::io::Error::other)?;

    // A concurrent caller may have won the race; the scan is deterministic.
    Ok(SYSTEM_FONTS.get_or_init(|| fonts).clone())
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("fonts")
        .invoke_handler(tauri::generate_handler![fonts_get_system_fonts])
        .build()
}
