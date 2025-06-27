import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist and create them only if they don't

    // Check and create users table
    const usersTableExists = await queryRunner.hasTable('users');
    if (!usersTableExists) {
      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "email" character varying NOT NULL,
          "password" character varying NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_users_email_1700000000001" UNIQUE ("email"),
          CONSTRAINT "PK_users_id_1700000000001" PRIMARY KEY ("id")
        )
      `);
    }

    // Check and create developers table
    const developersTableExists = await queryRunner.hasTable('developers');
    if (!developersTableExists) {
      await queryRunner.query(`
        CREATE TABLE "developers" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying NOT NULL,
          "link" character varying,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_developers_id_1700000000001" PRIMARY KEY ("id")
        )
      `);
    }

    // Check and create resumes table
    const resumesTableExists = await queryRunner.hasTable('resumes');
    if (!resumesTableExists) {
      await queryRunner.query(`
        CREATE TABLE "resumes" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "jobDescription" text NOT NULL,
          "title" character varying(255),
          "skills" text,
          "resumeUrl" character varying(500) NOT NULL,
          "pdfUrl" character varying(500),
          "developerId" uuid NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_resumes_id_1700000000001" PRIMARY KEY ("id")
        )
      `);
    }

    // Add missing columns to existing resumes table if needed
    const titleColumnExists = await queryRunner.hasColumn('resumes', 'title');
    if (!titleColumnExists) {
      try {
        await queryRunner.query(
          `ALTER TABLE "resumes" ADD "title" character varying(255)`,
        );
      } catch (error) {
        console.log('Title column might already exist, continuing...');
      }
    }

    const skillsColumnExists = await queryRunner.hasColumn('resumes', 'skills');
    if (!skillsColumnExists) {
      try {
        await queryRunner.query(`ALTER TABLE "resumes" ADD "skills" text`);
      } catch (error) {
        console.log('Skills column might already exist, continuing...');
      }
    }

    const pdfUrlColumnExists = await queryRunner.hasColumn('resumes', 'pdfUrl');
    if (!pdfUrlColumnExists) {
      try {
        await queryRunner.query(
          `ALTER TABLE "resumes" ADD "pdfUrl" character varying(500)`,
        );
      } catch (error) {
        console.log('PdfUrl column might already exist, continuing...');
      }
    }

    // Check and add foreign key constraint if it doesn't exist
    const foreignKeyExists = await queryRunner.hasColumn(
      'resumes',
      'developerId',
    );
    if (foreignKeyExists) {
      try {
        await queryRunner.query(`
          ALTER TABLE "resumes" 
          ADD CONSTRAINT "FK_resumes_developer_1700000000001" 
          FOREIGN KEY ("developerId") 
          REFERENCES "developers"("id") 
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
      } catch (error) {
        // Foreign key might already exist, ignore the error
        console.log(
          'Foreign key constraint might already exist, continuing...',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints if they exist
    try {
      await queryRunner.query(
        `ALTER TABLE "resumes" DROP CONSTRAINT "FK_resumes_developer_1700000000001"`,
      );
    } catch (error) {
      // Constraint might not exist, ignore the error
    }

    // Drop tables in reverse order (only if they exist)
    const resumesTableExists = await queryRunner.hasTable('resumes');
    if (resumesTableExists) {
      await queryRunner.query(`DROP TABLE "resumes"`);
    }

    const developersTableExists = await queryRunner.hasTable('developers');
    if (developersTableExists) {
      await queryRunner.query(`DROP TABLE "developers"`);
    }

    const usersTableExists = await queryRunner.hasTable('users');
    if (usersTableExists) {
      await queryRunner.query(`DROP TABLE "users"`);
    }
  }
}
