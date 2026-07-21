import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260721043940 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review" ("id" text not null, "medusa_product_id" text not null, "rating" integer not null, "body" text not null, "author_name" text not null, "locale" text check ("locale" in ('pl', 'en', 'uk')) not null default 'pl', "photo_key" text null, "verified_buyer" boolean not null default false, "order_display_id" integer null, "status" text check ("status" in ('pending', 'published', 'rejected')) not null default 'pending', "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_medusa_product_id" ON "review" ("medusa_product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`);
  }

}
