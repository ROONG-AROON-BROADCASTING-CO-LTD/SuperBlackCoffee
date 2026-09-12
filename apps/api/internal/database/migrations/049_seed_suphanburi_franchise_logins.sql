CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH account_seed(franchise_email, username, email, password, display_name, branch_code) AS (
  VALUES
    ('franchise-suphanburi-s@superblackcoffee.local', 'franchise_suphanburi_s', 'franchise_suphanburi_s@superblackcoffee.local', 'SuphanburiS!2569', 'แฟรนไชส์สุพรรณบุรี S', 'FR-SUP-001-S'),
    ('franchise-suphanburi-m@superblackcoffee.local', 'franchise_suphanburi_m', 'franchise_suphanburi_m@superblackcoffee.local', 'SuphanburiM!2569', 'แฟรนไชส์สุพรรณบุรี M', 'FR-SUP-001-M'),
    ('franchise-suphanburi-l@superblackcoffee.local', 'franchise_suphanburi_l', 'franchise_suphanburi_l@superblackcoffee.local', 'SuphanburiL!2569', 'แฟรนไชส์สุพรรณบุรี L', 'FR-SUP-001-L')
)
INSERT INTO users(name, username, email, password_hash, role, franchisee_id, branch_id)
SELECT a.display_name, a.username, a.email, crypt(a.password, gen_salt('bf')), 'franchise_owner', f.id, b.id
FROM account_seed a
JOIN franchisees f ON f.email = a.franchise_email
JOIN branches b ON b.code = a.branch_code
ON CONFLICT (lower(username)) DO NOTHING;

UPDATE franchisees
SET status = 'active'
WHERE email IN (
  'franchise-suphanburi-s@superblackcoffee.local',
  'franchise-suphanburi-m@superblackcoffee.local',
  'franchise-suphanburi-l@superblackcoffee.local'
);

UPDATE branches
SET status = 'active'
WHERE code IN ('FR-SUP-001-S', 'FR-SUP-001-M', 'FR-SUP-001-L');
