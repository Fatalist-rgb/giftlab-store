import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260810120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "review" add column if not exists "avatar_key" text null;`);
    this.addSql(`alter table "review" add column if not exists "variant_label" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "review" drop column if exists "avatar_key";`);
    this.addSql(`alter table "review" drop column if exists "variant_label";`);
  }

}
