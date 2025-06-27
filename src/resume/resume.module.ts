import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { FirebaseStorageService } from '../services/firebase-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resume, Developer])],
  controllers: [ResumeController],
  providers: [ResumeService, FirebaseStorageService],
  exports: [ResumeService],
})
export class ResumeModule {}
