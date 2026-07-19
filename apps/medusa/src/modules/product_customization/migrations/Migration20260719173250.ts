import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260719173250 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_schema" ("id" text not null, "product_id" text not null, "version" integer not null default 1, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "definition" jsonb not null, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_schema_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_schema_product_id" ON "product_schema" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_schema_deleted_at" ON "product_schema" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_schema" cascade;`);
  }

}
