import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260720172411 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "design_state" add column if not exists "quantity" integer not null default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "design_state" drop column if exists "quantity";`);
  }

}
