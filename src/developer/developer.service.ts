import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from '../entities/developer.entity';
import { DocxUtils } from '../utils/docx.utils';
import * as path from 'path';
import { FirebaseStorageService } from '../services/firebase-storage.service';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  async createDeveloper(
    name: string,
    userId: string,
    resumeFile?: Express.Multer.File,
  ): Promise<Developer> {
    let resumeUrl = '';
    let information = '';

    // Handle resume file upload if provided
    if (resumeFile) {
      resumeUrl = await this.saveResumeFile(resumeFile);
      information = await this.extractTextFromResumeFile(resumeFile);
    }

    // Create developer with resume link and extracted information
    const developer = this.developerRepository.create({
      name,
      userId,
      link: resumeUrl,
      information,
    });

    return this.developerRepository.save(developer);
  }

  private async saveResumeFile(file: Express.Multer.File): Promise<string> {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;

    // Generate storage path for Firebase
    const storagePath = `resumes/uploads/${fileName}`;

    // Upload file to Firebase Storage
    const fileUrl = await this.firebaseStorageService.uploadBuffer(
      file.buffer,
      storagePath,
      file.mimetype,
    );

    return fileUrl;
  }

  private async extractTextFromResumeFile(
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      // Only handle DOCX files
      const fileExtension = path.extname(file.originalname).toLowerCase();

      if (fileExtension !== '.docx') {
        return 'Only DOCX files are supported for text extraction';
      }

      // Extract text directly from file buffer using DocxUtils
      const extractedText = DocxUtils.extractTextFromFileBuffer(file.buffer);
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from DOCX file:', error.message);
      return 'Unable to extract text from DOCX file';
    }
  }

  async getDevelopersByUserId(userId: string): Promise<Developer[]> {
    return this.developerRepository.find({
      where: { userId },
    });
  }

  async getDeveloperById(id: string, userId: string): Promise<Developer> {
    const developer = await this.developerRepository.findOne({
      where: { id, userId },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    return developer;
  }

  async updateDeveloper(
    id: string,
    userId: string,
    updateData: Partial<Developer>,
  ): Promise<Developer> {
    const developer = await this.getDeveloperById(id, userId);

    // Update the developer with new data
    Object.assign(developer, updateData);

    return this.developerRepository.save(developer);
  }

  async updateDeveloperWithResume(
    id: string,
    userId: string,
    updateData: Partial<Developer>,
    resumeFile?: Express.Multer.File,
  ): Promise<Developer> {
    const developer = await this.getDeveloperById(id, userId);

    // Handle resume file upload if provided
    if (resumeFile) {
      const resumeUrl = await this.saveResumeFile(resumeFile);
      const information = await this.extractTextFromResumeFile(resumeFile);

      updateData.link = resumeUrl;
      updateData.information = information;
    }

    // Update the developer with new data
    Object.assign(developer, updateData);

    return this.developerRepository.save(developer);
  }
}
