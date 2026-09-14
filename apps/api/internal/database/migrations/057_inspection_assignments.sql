CREATE INDEX IF NOT EXISTS inspections_recent_branch_idx
  ON inspections(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inspection_templates_active_size_idx
  ON inspection_templates(active, branch_size, created_at DESC);
