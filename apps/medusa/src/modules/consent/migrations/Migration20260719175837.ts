import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260719175837 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "consent_record" ("id" text not null, "type" text check ("type" in ('photo_processing', 'cookies')) not null, "categories" jsonb null, "subject_ref" text not null, "granted_at" timestamptz not null, "ip_hash" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "consent_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_consent_record_subject_ref" ON "consent_record" ("subject_ref") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_consent_record_deleted_at" ON "consent_record" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "consent_record" cascade;`);
  }

}
