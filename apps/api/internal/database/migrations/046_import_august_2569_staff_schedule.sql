-- Restore the existing Phitsanulok staff roster and import the supplied August 2569 schedule.
-- The workbook contains no accounts; seeded staff receive the existing admin password hash,
-- consistent with the earlier schedule seed migrations.
WITH staff(name, username, role, default_starts_at, default_ends_at) AS (
  VALUES
  ('เชฟเฉลิมพล (ต้น)', 'chef_chalermpol_plk', 'branch_manager', '08:00'::time, '17:00'::time),
  ('เกียรติขจร (ฟิวส์)', 'kiatkajorn_fuse_plk', 'cashier', '09:00'::time, '18:00'::time),
  ('พสธร (ใจแอนด์)', 'phasathorn_jae_plk', 'cashier', '11:30'::time, '20:30'::time),
  ('ธนากร (พี่เอ้)', 'thanakorn_ae_plk', 'cashier', '11:30'::time, '20:30'::time)
), branch AS (
  SELECT id FROM branches WHERE code = 'SBC-PLK-001'
), admin_hash AS (
  SELECT password_hash FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
)
INSERT INTO users(name, username, email, password_hash, role, branch_id, default_starts_at, default_ends_at)
SELECT staff.name, staff.username, staff.username || '@superblackcoffee.local', admin_hash.password_hash,
       staff.role, branch.id, staff.default_starts_at, staff.default_ends_at
FROM staff
CROSS JOIN branch
CROSS JOIN admin_hash
WHERE NOT EXISTS (
  SELECT 1 FROM users existing
  WHERE existing.branch_id = branch.id
    AND lower(trim(existing.name)) = lower(trim(staff.name))
)
ON CONFLICT (lower(username)) DO NOTHING;

WITH imported_schedule(username, shift_date, starts_at, ends_at, status, leave_type) AS (
  VALUES
  ('chef_chalermpol_plk', DATE '2026-08-01', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-02', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-03', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-04', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-05', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-06', TIME '08:00', TIME '17:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('chef_chalermpol_plk', DATE '2026-08-07', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-08', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-09', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-10', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-12', TIME '08:00', TIME '17:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('chef_chalermpol_plk', DATE '2026-08-13', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-14', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-15', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-16', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-17', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-18', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-19', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-20', TIME '08:00', TIME '17:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('chef_chalermpol_plk', DATE '2026-08-21', TIME '08:00', TIME '17:00', 'day_off', 'วันหยุดนักขัตฤกษ์'),
  ('chef_chalermpol_plk', DATE '2026-08-22', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-23', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-24', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-25', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-26', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-27', TIME '08:00', TIME '17:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('chef_chalermpol_plk', DATE '2026-08-28', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-29', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-30', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('chef_chalermpol_plk', DATE '2026-08-31', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-01', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-02', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-03', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-04', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-05', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-06', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-07', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-08', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-09', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-10', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-11', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-12', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดนักขัตฤกษ์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-13', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-14', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-15', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-16', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-17', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-18', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-19', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-20', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-21', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-22', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-23', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-24', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-25', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-26', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-27', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-28', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-29', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('kiatkajorn_fuse_plk', DATE '2026-08-30', TIME '09:00', TIME '18:00', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('kiatkajorn_fuse_plk', DATE '2026-08-31', TIME '09:00', TIME '18:00', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-01', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-02', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-03', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-04', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-05', TIME '11:30', TIME '20:30', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('phasathorn_jae_plk', DATE '2026-08-06', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-07', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-08', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-09', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-10', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-11', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-12', TIME '08:00', TIME '17:00', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-13', TIME '11:30', TIME '20:30', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('phasathorn_jae_plk', DATE '2026-08-14', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-15', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-16', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-17', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-18', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-19', TIME '11:30', TIME '20:30', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('phasathorn_jae_plk', DATE '2026-08-20', TIME '11:30', TIME '20:30', 'day_off', 'วันหยุดนักขัตฤกษ์'),
  ('phasathorn_jae_plk', DATE '2026-08-21', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-22', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-23', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-24', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-25', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-26', TIME '11:30', TIME '20:30', 'day_off', 'วันหยุดประจำสัปดาห์'),
  ('phasathorn_jae_plk', DATE '2026-08-27', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-28', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-29', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-30', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('phasathorn_jae_plk', DATE '2026-08-31', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-24', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-25', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-27', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-28', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-29', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-30', TIME '11:30', TIME '20:30', 'scheduled', NULL),
  ('thanakorn_ae_plk', DATE '2026-08-31', TIME '11:30', TIME '20:30', 'scheduled', NULL)
)
INSERT INTO staff_shifts(user_id, branch_id, shift_date, starts_at, ends_at, status, leave_type)
SELECT staff.id, branch.id, imported.shift_date, imported.starts_at, imported.ends_at, imported.status, imported.leave_type
FROM imported_schedule imported
JOIN users staff ON staff.username = imported.username
JOIN branches branch ON branch.id = staff.branch_id AND branch.code = 'SBC-PLK-001'
ON CONFLICT (user_id, shift_date) DO UPDATE
SET starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    leave_type = EXCLUDED.leave_type
WHERE NOT EXISTS (
  SELECT 1
  FROM staff_attendance attendance
  WHERE attendance.user_id = staff_shifts.user_id
    AND attendance.work_date = staff_shifts.shift_date
    AND attendance.check_in_at IS NOT NULL
);
