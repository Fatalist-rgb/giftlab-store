import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260719174314 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "price_entry" ("id" text not null, "medusa_product_id" text not null, "variant_key" text not null default 'default', "price" integer not null, "effective_from" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "price_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_price_entry_medusa_product_id" ON "price_entry" ("medusa_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_price_entry_deleted_at" ON "price_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "price_entry" cascade;`);
  }

}
