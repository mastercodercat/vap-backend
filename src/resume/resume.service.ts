import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { DocxUtils } from '../utils/docx.utils';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepository: Repository<Resume>,
    @InjectRepository(Developer)
    private readonly developerRepository: Repository<Developer>,
    private readonly configService: ConfigService,
  ) {
    // Initialize DocxUtils with config service
    DocxUtils.initialize(this.configService);
  }

  async createAutomaticResume(
    jobDescription: string,
    developerId: string,
  ): Promise<Resume> {
    // Verify developer exists
    const developer = await this.developerRepository.findOne({
      where: { id: developerId },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    // Generate automatic resume using your script
    const resumeUrl = await this.generateAutomaticResume(
      jobDescription,
      developer,
    );

    // Create resume record
    const resume = this.resumeRepository.create({
      jobDescription,
      resumeUrl,
      developerId,
    });

    return this.resumeRepository.save(resume);
  }

  private async generateAutomaticResume(
    jobDescription: string,
    developer: Developer,
  ): Promise<string> {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'generated');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `auto-resume-${developer.id}-${Date.now()}`;
    const docxName = `${fileName}.docx`;
    const docxPath = path.join(uploadsDir, docxName);
    const pdfName = `${fileName}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfName);

    // Use developer.link if available, otherwise use empty string
    const resumePath = developer.link || '';

    const finished = await DocxUtils.generateResume(
      jobDescription,
      resumePath,
      docxPath,
      pdfPath,
    );

    if (!finished) {
      throw new Error('Failed to generate resume');
    }

    return `/uploads/generated/${fileName}`;
  }

  async getResumesByDeveloperId(developerId: string): Promise<Resume[]> {
    return this.resumeRepository.find({
      where: { developerId },
    });
  }

  async getResumeById(id: string): Promise<Resume> {
    const resume = await this.resumeRepository.findOne({
      where: { id },
      relations: ['developer'],
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }
}
