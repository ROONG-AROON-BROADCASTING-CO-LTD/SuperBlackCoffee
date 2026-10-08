-- Postal employees follow one department-wide pattern. Keep explicit daily
-- overrides intact so exceptional opening hours are never overwritten.
UPDATE staff_shifts AS shift
SET
  starts_at = CASE
    WHEN EXTRACT(ISODOW FROM shift.shift_date)::int BETWEEN 1 AND 5 THEN TIME '09:00'
    ELSE TIME '10:00'
  END,
  ends_at = CASE
    WHEN EXTRACT(ISODOW FROM shift.shift_date)::int BETWEEN 1 AND 5 THEN TIME '18:00'
    ELSE TIME '19:00'
  END
FROM users AS staff
WHERE shift.user_id = staff.id
  AND staff.department = 'postal'
  AND NOT COALESCE(shift.is_time_override, FALSE);
