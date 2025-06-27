import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResumeJobForeignKey1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the foreign key constraint already exists
    const constraintExists = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'resumes' 
      AND constraint_name = 'FK_resumes_jobId'
    `);

    if (constraintExists.length === 0) {
      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "resumes" 
        ADD CONSTRAINT "FK_resumes_jobId" 
        FOREIGN KEY ("jobId") 
        REFERENCES "jobs"("id") 
        ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint FK_resumes_jobId');
    } else {
      console.log('✅ Foreign key constraint FK_resumes_jobId already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint if it exists
    try {
      await queryRunner.query(`
        ALTER TABLE "resumes" 
        DROP CONSTRAINT "FK_resumes_jobId"
      `);
      console.log('✅ Dropped foreign key constraint FK_resumes_jobId');
    } catch (error) {
      console.warn('Could not drop foreign key constraint:', error.message);
    }
  }
}
