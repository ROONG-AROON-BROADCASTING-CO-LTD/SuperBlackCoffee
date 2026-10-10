CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  promotion_type TEXT NOT NULL,
  benefit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired')),
  image_url TEXT NOT NULL DEFAULT '',
  channels TEXT[] NOT NULL DEFAULT ARRAY['storefront']::TEXT[],
  eligibility TEXT NOT NULL DEFAULT '',
  starts_on DATE,
  ends_on DATE,
  terms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS promotion_branches (
  promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, branch_id)
);

CREATE TABLE IF NOT EXISTS promotion_menu_items (
  promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  PRIMARY KEY (promotion_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id BIGSERIAL PRIMARY KEY,
  promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  order_reference TEXT NOT NULL DEFAULT '',
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_promotion_branches_branch ON promotion_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_promotion_menu_items_menu ON promotion_menu_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion ON promotion_redemptions(promotion_id);
