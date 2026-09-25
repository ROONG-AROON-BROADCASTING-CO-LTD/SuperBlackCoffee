ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN NOT NULL DEFAULT false;

INSERT INTO branches(name, code, size, status, is_headquarters, opens_at, closes_at)
VALUES ('สำนักงานใหญ่', 'SBC-HQ', 'S', 'active', true, '09:00', '18:00')
ON CONFLICT (code) DO UPDATE
SET is_headquarters = true;
