import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Developer } from '../entities/developer.entity';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { FirebaseStorageService } from '../services/firebase-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Developer])],
  controllers: [DeveloperController],
  providers: [DeveloperService, FirebaseStorageService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
