import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobIdToResumes1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add jobId column
    await queryRunner.query(`
      ALTER TABLE "resumes" 
      ADD COLUMN "jobId" uuid
    `);

    // Add foreign key constraint (only if jobs table exists)
    try {
      await queryRunner.query(`
        ALTER TABLE "resumes" 
        ADD CONSTRAINT "FK_resumes_jobId" 
        FOREIGN KEY ("jobId") 
        REFERENCES "jobs"("id") 
        ON DELETE SET NULL
      `);
    } catch (error) {
      console.warn(
        'Could not add foreign key constraint - jobs table may not exist yet:',
        error.message,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint if it exists
    try {
      await queryRunner.query(`
        ALTER TABLE "resumes" 
        DROP CONSTRAINT "FK_resumes_jobId"
      `);
    } catch (error) {
      console.warn('Could not drop foreign key constraint:', error.message);
    }

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "resumes" 
      DROP COLUMN "jobId"
    `);
  }
}
