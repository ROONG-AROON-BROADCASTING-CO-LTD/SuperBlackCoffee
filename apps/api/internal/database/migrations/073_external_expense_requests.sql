CREATE TABLE IF NOT EXISTS expense_requests (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  category TEXT NOT NULL CHECK (category IN ('maintenance','office','transport','service','other')),
  estimated_amount NUMERIC(12,2) NOT NULL CHECK (estimated_amount > 0),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','funded','purchasing','awaiting_documents','completed','rejected')),
  requested_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_requests_branch_created_idx
  ON expense_requests(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS expense_requests_status_created_idx
  ON expense_requests(status, created_at DESC);
