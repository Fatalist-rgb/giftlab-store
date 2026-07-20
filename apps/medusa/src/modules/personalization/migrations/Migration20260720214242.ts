import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260720214242 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_line_design" add column if not exists "order_id" text null, add column if not exists "order_display_id" integer null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_line_design_order_id" ON "order_line_design" ("order_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_order_line_design_order_id";`);
    this.addSql(`alter table if exists "order_line_design" drop column if exists "order_id", drop column if exists "order_display_id";`);
  }

}
