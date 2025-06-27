import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToUsers1700000000002 implements MigrationInterface {
  name = 'AddNameToUsers1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if name column already exists
    const nameColumnExists = await queryRunner.hasColumn('users', 'name');
    if (!nameColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "name" character varying(255)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove name column if it exists
    const nameColumnExists = await queryRunner.hasColumn('users', 'name');
    if (nameColumnExists) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
    }
  }
}
