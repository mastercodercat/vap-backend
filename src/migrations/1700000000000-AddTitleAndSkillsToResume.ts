import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTitleAndSkillsToResume1700000000000
  implements MigrationInterface
{
  name = 'AddTitleAndSkillsToResume1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resumes" ADD "title" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "resumes" ADD "skills" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "resumes" DROP COLUMN "skills"`);
    await queryRunner.query(`ALTER TABLE "resumes" DROP COLUMN "title"`);
  }
}
