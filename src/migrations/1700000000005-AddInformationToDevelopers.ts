import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInformationToDevelopers1700000000005
  implements MigrationInterface
{
  name = 'AddInformationToDevelopers1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if information column already exists
    const informationColumnExists = await queryRunner.hasColumn(
      'developers',
      'information',
    );
    if (!informationColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "developers" ADD "information" text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove information column if it exists
    const informationColumnExists = await queryRunner.hasColumn(
      'developers',
      'information',
    );
    if (informationColumnExists) {
      await queryRunner.query(
        `ALTER TABLE "developers" DROP COLUMN "information"`,
      );
    }
  }
}
