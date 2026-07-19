ALTER TABLE "draft_revisions"
ADD COLUMN "operation" VARCHAR(24) NOT NULL DEFAULT 'RENAME',
ADD COLUMN "text_color" VARCHAR(7),
ADD COLUMN "background_color" VARCHAR(7),
ADD COLUMN "button_label" VARCHAR(120),
ADD COLUMN "theme_preset" VARCHAR(24);

ALTER TABLE "draft_revisions"
ADD CONSTRAINT "draft_revisions_operation_check"
CHECK ("operation" IN ('RENAME', 'RECOLOR', 'CLONE', 'ADD_BUTTON', 'THEME')),
ADD CONSTRAINT "draft_revisions_text_color_check"
CHECK ("text_color" IS NULL OR "text_color" ~ '^#[0-9A-Fa-f]{6}$'),
ADD CONSTRAINT "draft_revisions_background_color_check"
CHECK ("background_color" IS NULL OR "background_color" ~ '^#[0-9A-Fa-f]{6}$'),
ADD CONSTRAINT "draft_revisions_theme_preset_check"
CHECK ("theme_preset" IS NULL OR "theme_preset" IN ('AURORA', 'MIDNIGHT', 'PAPER', 'SUNSET'));
