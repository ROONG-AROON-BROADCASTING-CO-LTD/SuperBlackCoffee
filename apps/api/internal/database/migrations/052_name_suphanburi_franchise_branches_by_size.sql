-- Branch names are used as the Admin catalogue selector key, so every
-- franchise branch must have a distinct visible name.
UPDATE branches
SET name = CASE code
  WHEN 'FR-SUP-001-S' THEN 'สุพรรณบุรี S'
  WHEN 'FR-SUP-001-M' THEN 'สุพรรณบุรี M'
  WHEN 'FR-SUP-001-L' THEN 'สุพรรณบุรี L'
  ELSE name
END
WHERE code IN ('FR-SUP-001-S', 'FR-SUP-001-M', 'FR-SUP-001-L');
