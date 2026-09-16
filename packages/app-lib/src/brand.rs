pub const PRODUCT_NAME: &str = "Starlight Launcher";
pub const SHORT_PRODUCT_NAME: &str = "Starlight";
pub const WEBSITE: &str = "https://skin.starlight.cool/";
pub const BUNDLE_IDENTIFIER: &str = "cool.starlight.launcher";
pub const DEEP_LINK_SCHEME: &str = "starlight";

pub fn user_agent(version: &str, os: &str) -> String {
    format!("garbage-human-studio/starlight/{version} ({os})")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_agent_is_unique_and_contains_no_contact_information() {
        let user_agent = user_agent("1.2.3", "windows");

        assert_eq!(
            user_agent,
            "garbage-human-studio/starlight/1.2.3 (windows)"
        );
        assert!(!user_agent.contains("ghs.red"));
        assert!(!user_agent.contains("http"));
        assert!(!user_agent.contains('@'));
    }
}
