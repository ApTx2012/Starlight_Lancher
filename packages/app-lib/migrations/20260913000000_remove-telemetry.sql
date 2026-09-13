UPDATE settings
SET telemetry = FALSE,
    telemetry_consent_version = 0,
    discord_rpc = FALSE
WHERE id = 0;

DROP TABLE IF EXISTS telemetry_error_daily;
DROP TABLE IF EXISTS telemetry_outbox;
DROP TABLE IF EXISTS telemetry_identity;
