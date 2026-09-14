ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS action_owner TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS checklist_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS maintenance_ticket_id BIGINT REFERENCES maintenance_tickets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS branch_asset_events (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES branch_assets(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','transferred','repairing','retired')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_asset_events_asset_idx
  ON branch_asset_events(asset_id, created_at DESC);
