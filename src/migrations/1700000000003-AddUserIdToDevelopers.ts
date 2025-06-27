import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToDevelopers1700000000003 implements MigrationInterface {
  name = 'AddUserIdToDevelopers1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if userId column already exists
    const userIdColumnExists = await queryRunner.hasColumn(
      'developers',
      'userId',
    );
    if (!userIdColumnExists) {
      await queryRunner.query(`ALTER TABLE "developers" ADD "userId" uuid`);
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await queryRunner.query(`
        ALTER TABLE "developers" 
        ADD CONSTRAINT "FK_developers_user_1700000000003" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    } catch (error) {
      // Foreign key might already exist, ignore the error
      console.log('Foreign key constraint might already exist, continuing...');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint if it exists
    try {
      await queryRunner.query(
        `ALTER TABLE "developers" DROP CONSTRAINT "FK_developers_user_1700000000003"`,
      );
    } catch (error) {
      // Constraint might not exist, ignore the error
    }

    // Remove userId column if it exists
    const userIdColumnExists = await queryRunner.hasColumn(
      'developers',
      'userId',
    );
    if (userIdColumnExists) {
      await queryRunner.query(`ALTER TABLE "developers" DROP COLUMN "userId"`);
    }
  }
}
