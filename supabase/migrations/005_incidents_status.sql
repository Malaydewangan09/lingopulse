-- Add resolved_at column and status to translation_incidents

ALTER TABLE translation_incidents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_translation_incidents_status ON translation_incidents(status);
CREATE INDEX IF NOT EXISTS idx_translation_incidents_last_seen_at ON translation_incidents(last_seen_at);
