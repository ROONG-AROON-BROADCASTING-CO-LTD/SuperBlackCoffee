-- Seed the three Suphanburi franchise size variants used by the admin catalogue.
-- They remain invited/inactive until credentials and activation are configured.
WITH franchise_seed(name, email, plan) AS (
  VALUES
    ('แฟรนไชส์สุพรรณบุรี S', 'franchise-suphanburi-s@superblackcoffee.local', 'S'),
    ('แฟรนไชส์สุพรรณบุรี M', 'franchise-suphanburi-m@superblackcoffee.local', 'M'),
    ('แฟรนไชส์สุพรรณบุรี L', 'franchise-suphanburi-l@superblackcoffee.local', 'L')
)
INSERT INTO franchisees(name, email, plan, status)
SELECT name, email, plan, 'invited'
FROM franchise_seed
ON CONFLICT (email) DO NOTHING;

WITH branch_seed(franchise_email, branch_name, branch_code, branch_size) AS (
  VALUES
    ('franchise-suphanburi-s@superblackcoffee.local', 'สุพรรณบุรี', 'FR-SUP-001-S', 'S'),
    ('franchise-suphanburi-m@superblackcoffee.local', 'สุพรรณบุรี', 'FR-SUP-001-M', 'M'),
    ('franchise-suphanburi-l@superblackcoffee.local', 'สุพรรณบุรี', 'FR-SUP-001-L', 'L')
)
INSERT INTO branches(franchisee_id, name, code, size, status)
SELECT f.id, b.branch_name, b.branch_code, b.branch_size, 'inactive'
FROM branch_seed b
JOIN franchisees f ON f.email = b.franchise_email
ON CONFLICT (code) DO NOTHING;
