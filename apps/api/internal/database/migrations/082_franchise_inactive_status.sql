-- The status endpoint exposes inactive; retain existing invited/suspended values.
ALTER TABLE franchisees DROP CONSTRAINT franchisees_status_check;
ALTER TABLE franchisees ADD CONSTRAINT franchisees_status_check
  CHECK (status IN ('invited', 'active', 'suspended', 'inactive'));
