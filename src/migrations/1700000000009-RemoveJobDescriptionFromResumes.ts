import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveJobDescriptionFromResumes1700000000009
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove jobDescription column
    await queryRunner.query(`
      ALTER TABLE "resumes" 
      DROP COLUMN "jobDescription"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add jobDescription column back
    await queryRunner.query(`
      ALTER TABLE "resumes" 
      ADD COLUMN "jobDescription" text NOT NULL
    `);
  }
}
