-- Synced pack catalog tables.
--
-- These two tables were missed when the sync feature tables were ported;
-- 20261003000200_synced-pack-selection.sql alters `synced_pack_catalog`,
-- so it must exist first.

CREATE TABLE synced_pack_catalog (
	id TEXT PRIMARY KEY NOT NULL,
	project_type TEXT NOT NULL CHECK (project_type IN ('resourcepack', 'datapack')),
	file_name TEXT NOT NULL,
	sha1 TEXT NOT NULL UNIQUE,
	size INTEGER NOT NULL CHECK (size >= 0),
	game_versions_json TEXT NOT NULL DEFAULT '[]',
	enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
	created_at INTEGER NOT NULL,
	modified_at INTEGER NOT NULL
);

CREATE INDEX synced_pack_catalog_type ON synced_pack_catalog(project_type, modified_at);

CREATE TABLE synced_pack_instances (
	pack_id TEXT NOT NULL,
	instance_id TEXT NOT NULL,
	excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
	materialized_path TEXT,
	modified_at INTEGER NOT NULL,
	PRIMARY KEY (pack_id, instance_id),
	FOREIGN KEY (pack_id) REFERENCES synced_pack_catalog(id) ON DELETE CASCADE,
	FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE INDEX synced_pack_instances_instance ON synced_pack_instances(instance_id, excluded);