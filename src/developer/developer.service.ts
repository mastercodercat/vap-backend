import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from '../entities/developer.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DeveloperService {
  constructor(
    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,
  ) {}

  async createDeveloper(
    name: string,
    userId: string,
    resumeFile?: Express.Multer.File,
  ): Promise<Developer> {
    let resumeUrl = '';

    // Handle resume file upload if provided
    if (resumeFile) {
      resumeUrl = await this.saveResumeFile(resumeFile);
    }

    // Create developer with resume link
    const developer = this.developerRepository.create({
      name,
      userId,
      link: resumeUrl,
    });

    return this.developerRepository.save(developer);
  }

  private async saveResumeFile(file: Express.Multer.File): Promise<string> {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return the URL path
    return `/uploads/resumes/${fileName}`;
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
      updateData.link = resumeUrl;
    }

    // Update the developer with new data
    Object.assign(developer, updateData);

    return this.developerRepository.save(developer);
  }
}
