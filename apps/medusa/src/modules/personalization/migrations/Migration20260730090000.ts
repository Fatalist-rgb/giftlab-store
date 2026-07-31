import { Migration } from '@mikro-orm/migrations'

/**
 * Adds the "skipped" cutout status: the customer's browser could not remove the photo
 * background and they chose to order with the plain photo. Such an upload is printable
 * (the face zone is masked) but the admin flags the line for the operator.
 *
 * The enum lives as a text column with a check constraint, so the change is a constraint
 * swap — no data migration, existing rows stay valid.
 */
export class Migration20260730090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "uploaded_photo" drop constraint if exists "uploaded_photo_cutout_status_check";`,
    )
    this.addSql(
      `alter table if exists "uploaded_photo" add constraint "uploaded_photo_cutout_status_check" check ("cutout_status" in ('pending', 'ready', 'failed', 'skipped'));`,
    )
  }

  override async down(): Promise<void> {
    // anything already marked "skipped" would violate the narrower constraint
    this.addSql(`update "uploaded_photo" set "cutout_status" = 'failed' where "cutout_status" = 'skipped';`)
    this.addSql(
      `alter table if exists "uploaded_photo" drop constraint if exists "uploaded_photo_cutout_status_check";`,
    )
    this.addSql(
      `alter table if exists "uploaded_photo" add constraint "uploaded_photo_cutout_status_check" check ("cutout_status" in ('pending', 'ready', 'failed'));`,
    )
  }
}
