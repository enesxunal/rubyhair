-- Ruby Hair independent PostgreSQL commerce schema, stage only.
-- Neither this file nor the Next.js preview creates production orders.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  material text,
  pack_description text,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  color_code text NOT NULL,
  color_label text NOT NULL,
  length_code text NOT NULL,
  length_label text NOT NULL,
  price_cents integer NOT NULL CHECK(price_cents >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
  image_path text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  legacy_woo_id integer UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,color_code,length_code)
);
CREATE TABLE IF NOT EXISTS shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','pending_payment','paid','cancelled','fulfilled','refunded')),
  currency char(3) NOT NULL DEFAULT 'EUR',
  subtotal_cents integer NOT NULL DEFAULT 0 CHECK(subtotal_cents>=0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK(shipping_cents>=0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK(tax_cents>=0),
  total_cents integer NOT NULL DEFAULT 0 CHECK(total_cents>=0),
  payment_reference text UNIQUE,
  customer_email text,
  billing_address jsonb,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  unit_price_cents integer NOT NULL CHECK(unit_price_cents >= 0),
  line_total_cents integer NOT NULL CHECK(line_total_cents >= 0)
);
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES shop_orders(id),
  provider text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_created ON shop_orders(status,created_at DESC);
CREATE INDEX IF NOT EXISTS variant_product_active ON product_variants(product_id,active);
COMMIT;
