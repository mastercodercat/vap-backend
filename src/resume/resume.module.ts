import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resume, Developer])],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
