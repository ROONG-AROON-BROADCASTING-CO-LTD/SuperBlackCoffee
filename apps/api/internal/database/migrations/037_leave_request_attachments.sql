CREATE TABLE IF NOT EXISTS staff_leave_request_attachments (
  id BIGSERIAL PRIMARY KEY,
  leave_request_id BIGINT NOT NULL REFERENCES staff_leave_requests(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  content BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_leave_request_attachments_request_idx
  ON staff_leave_request_attachments(leave_request_id, id);
