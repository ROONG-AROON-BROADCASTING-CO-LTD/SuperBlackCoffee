ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_shifts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Preserve the existing primary/secondary-shift setup as the first version of
-- the more flexible default-shift list. The primary shift is the fallback for
-- every day; each additional shift overrides the selected weekdays.
UPDATE users
SET default_shifts = jsonb_build_array(
  jsonb_build_object(
    'startsAt', COALESCE(default_starts_at, TIME '08:00')::text,
    'endsAt', COALESCE(default_ends_at, TIME '17:00')::text,
    'weekdays', '[]'::jsonb
  )
) || CASE
  WHEN default_second_starts_at IS NOT NULL AND default_second_ends_at IS NOT NULL
    THEN jsonb_build_array(
      jsonb_build_object(
        'startsAt', default_second_starts_at::text,
        'endsAt', default_second_ends_at::text,
        'weekdays', to_jsonb(COALESCE(default_second_shift_days, '{}'::integer[]))
      )
    )
  ELSE '[]'::jsonb
END
WHERE jsonb_array_length(default_shifts) = 0
  AND role IN ('cashier', 'branch_manager');
