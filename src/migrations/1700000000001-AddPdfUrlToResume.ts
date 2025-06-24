import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfUrlToResume1700000000001 implements MigrationInterface {
  name = 'AddPdfUrlToResume1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resumes" ADD "pdfUrl" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "resumes" DROP COLUMN "pdfUrl"`);
  }
}
