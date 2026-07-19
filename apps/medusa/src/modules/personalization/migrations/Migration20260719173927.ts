import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260719173927 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_line_design" drop constraint if exists "order_line_design_medusa_line_item_id_unique";`);
    this.addSql(`create table if not exists "design_state" ("id" text not null, "product_schema_id" text not null, "schema_version" integer not null, "character_selections" jsonb not null, "face_layer" jsonb null, "text_values" jsonb null, "selected_options" jsonb null, "photo_status" text check ("photo_status" in ('ready', 'deferred', 'processing', 'failed')) not null default 'deferred', "computed_price" integer not null, "is_personalized" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "design_state_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_state_product_schema_id" ON "design_state" ("product_schema_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_design_state_deleted_at" ON "design_state" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_line_design" ("id" text not null, "medusa_line_item_id" text not null, "design_state_id" text not null, "schema_version" integer not null, "production_package_id" text null, "render_status" text check ("render_status" in ('queued', 'processing', 'ready', 'failed', 'awaiting_photo')) not null default 'queued', "withdrawal_right" text check ("withdrawal_right" in ('excluded', 'applies')) not null, "withdrawal_notice_version" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_line_design_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_line_design_medusa_line_item_id_unique" ON "order_line_design" ("medusa_line_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_design_design_state_id" ON "order_line_design" ("design_state_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_design_deleted_at" ON "order_line_design" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "production_package" ("id" text not null, "order_line_id" text not null, "status" text check ("status" in ('queued', 'processing', 'ready', 'failed', 'awaiting_photo')) not null default 'queued', "print_png_key" text null, "print_pdf_key" text null, "cut_svg_key" text null, "spec_json_key" text null, "preview_key" text null, "dpi" integer not null default 300, "render_engine_version" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "production_package_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_production_package_order_line_id" ON "production_package" ("order_line_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_production_package_deleted_at" ON "production_package" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "uploaded_photo" ("id" text not null, "original_key" text not null, "cutout_key" text null, "preview_key" text null, "mime" text null, "width_px" integer null, "height_px" integer null, "cutout_status" text check ("cutout_status" in ('pending', 'ready', 'failed')) not null default 'pending', "checksum" text null, "consent_id" text null, "expires_at" timestamptz null, "status" text check ("status" in ('active', 'deleted')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "uploaded_photo_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_uploaded_photo_deleted_at" ON "uploaded_photo" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "design_state" cascade;`);

    this.addSql(`drop table if exists "order_line_design" cascade;`);

    this.addSql(`drop table if exists "production_package" cascade;`);

    this.addSql(`drop table if exists "uploaded_photo" cascade;`);
  }

}
