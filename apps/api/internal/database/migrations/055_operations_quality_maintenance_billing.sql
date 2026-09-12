CREATE TABLE IF NOT EXISTS branch_assets (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL, asset_type TEXT NOT NULL, serial_number TEXT, warranty_until DATE,
  maintenance_due DATE, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','repairing','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  asset_id BIGINT REFERENCES branch_assets(id) ON DELETE SET NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','waiting_parts','completed')),
  technician_name TEXT, labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0, parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel_cost NUMERIC(12,2) NOT NULL DEFAULT 0, due_at DATE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inspection_templates (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, branch_size TEXT NOT NULL DEFAULT 'all' CHECK (branch_size IN ('all','S','M','L')),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inspections (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  template_id BIGINT REFERENCES inspection_templates(id) ON DELETE SET NULL, inspector_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','passed','needs_action','failed')),
  score NUMERIC(5,2), findings TEXT NOT NULL DEFAULT '', due_at DATE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS service_invoices (
  id BIGSERIAL PRIMARY KEY, branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  maintenance_ticket_id BIGINT REFERENCES maintenance_tickets(id) ON DELETE SET NULL,
  inspection_id BIGINT REFERENCES inspections(id) ON DELETE SET NULL, invoice_number TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL CHECK (service_type IN ('inspection','maintenance','parts','subscription')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  due_at DATE, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_tickets_branch_status_idx ON maintenance_tickets(branch_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS inspections_branch_status_idx ON inspections(branch_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS service_invoices_branch_status_idx ON service_invoices(branch_id,status,created_at DESC);
