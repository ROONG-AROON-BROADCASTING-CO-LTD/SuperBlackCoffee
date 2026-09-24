-- Durable work items let a large catalog sync finish independently of an HTTP request.
CREATE TABLE catalog_sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES catalog_templates(id) ON DELETE RESTRICT,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','partial_failed','failed')),
  total_branches INTEGER NOT NULL CHECK (total_branches >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- A second click while work is active returns the existing job.
CREATE UNIQUE INDEX catalog_sync_one_active_template_idx
  ON catalog_sync_jobs(template_id)
  WHERE status IN ('pending','processing');

CREATE TABLE catalog_sync_job_branches (
  job_id BIGINT NOT NULL REFERENCES catalog_sync_jobs(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (job_id,branch_id)
);

CREATE INDEX catalog_sync_branch_queue_idx
  ON catalog_sync_job_branches(next_attempt_at,job_id,branch_id)
  WHERE status IN ('pending','processing');

CREATE INDEX catalog_sync_job_branches_status_idx
  ON catalog_sync_job_branches(job_id,status);

CREATE INDEX branch_catalog_assignments_template_idx
  ON branch_catalog_template_assignments(template_id,branch_id);

CREATE INDEX menu_items_branch_source_idx
  ON menu_items(branch_id,catalog_template_menu_item_id)
  WHERE catalog_template_menu_item_id IS NOT NULL;

CREATE INDEX inventory_items_branch_template_idx
  ON inventory_items(branch_id,catalog_template_id)
  WHERE catalog_template_id IS NOT NULL;
