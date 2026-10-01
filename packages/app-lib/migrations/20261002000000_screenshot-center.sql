-- Screenshot center: unified index of per-instance screenshots plus
-- user-defined groups. Ported from the Axolotl implementation, trimmed of
-- the instance-sync / game-options tables that Starlight does not use.

CREATE TABLE screenshots (
	id TEXT NOT NULL PRIMARY KEY,
	instance_id TEXT NOT NULL,
	file_name TEXT NOT NULL,
	content_hash TEXT NOT NULL,
	file_size INTEGER NOT NULL,
	modified_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL,
	editor_state TEXT,
	UNIQUE (instance_id, file_name),
	FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE INDEX screenshots_instance_id ON screenshots(instance_id);
CREATE INDEX screenshots_instance_hash ON screenshots(instance_id, content_hash, file_size);

CREATE TABLE screenshot_groups (
	id TEXT NOT NULL PRIMARY KEY,
	name TEXT NOT NULL,
	display_order INTEGER NOT NULL DEFAULT 0,
	CHECK (length(trim(name)) > 0)
);

CREATE INDEX screenshot_groups_display_order ON screenshot_groups(display_order);

CREATE TABLE screenshot_group_memberships (
	screenshot_id TEXT NOT NULL PRIMARY KEY,
	group_id TEXT NOT NULL,
	FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE CASCADE,
	FOREIGN KEY (group_id) REFERENCES screenshot_groups(id) ON DELETE CASCADE
);

CREATE INDEX screenshot_group_memberships_group_id ON screenshot_group_memberships(group_id);
ALTER TABLE settings ADD COLUMN show_screenshots_tab_in_instances INTEGER NOT NULL DEFAULT FALSE CHECK (show_screenshots_tab_in_instances IN (0, 1));