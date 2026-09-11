ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT 'L'
  CHECK (size IN ('S', 'M', 'L'));

-- Existing franchise branches retain their current catalogue entitlement as the
-- initial branch size. Company-owned branches remain L by default.
UPDATE branches AS b
SET size = f.plan
FROM franchisees AS f
WHERE b.franchisee_id = f.id;
