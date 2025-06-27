import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { Job } from '../entities/job.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { FirebaseStorageService } from '../services/firebase-storage.service';
import { JobModule } from '../job/job.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resume, Developer, Job]), JobModule],
  controllers: [ResumeController],
  providers: [ResumeService, FirebaseStorageService],
  exports: [ResumeService],
})
export class ResumeModule {}
