import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Developer } from './entities/developer.entity';
import { Resume } from './entities/resume.entity';
import { Company } from './entities/company.entity';
import { Job } from './entities/job.entity';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { DeveloperModule } from './developer/developer.module';
import { ResumeModule } from './resume/resume.module';
import { CompanyModule } from './company/company.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Developer, Resume, Company, Job]),
    AuthModule,
    DeveloperModule,
    ResumeModule,
    CompanyModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
