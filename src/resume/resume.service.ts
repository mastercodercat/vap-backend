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
    docType: 'pdf' | 'docx',
  ): Promise<Resume> {
    // Verify developer exists
    const developer = await this.developerRepository.findOne({
      where: { id: developerId },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    // Extract title and skills from job description
    const { title, skills } =
      await DocxUtils.extractTitleAndSkillsFromJobDescription(jobDescription);

    // Generate automatic resume using your script
    const { resumeUrl, pdfUrl } = await this.generateAutomaticResume(
      jobDescription,
      developer,
      docType,
    );

    // Create resume record
    const resume = this.resumeRepository.create({
      jobDescription,
      title,
      skills,
      resumeUrl,
      pdfUrl,
      developerId,
    });

    return this.resumeRepository.save(resume);
  }

  private async generateAutomaticResume(
    jobDescription: string,
    developer: Developer,
    docType: 'pdf' | 'docx',
  ): Promise<{ resumeUrl: string; pdfUrl: string | undefined }> {
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
      docType === 'pdf',
      docxPath,
      pdfPath,
    );

    if (!finished) {
      throw new Error('Failed to generate resume');
    }

    if (docType === 'pdf') {
      return {
        resumeUrl: `/uploads/generated/${docxName}`,
        pdfUrl: `/uploads/generated/${pdfName}`,
      };
    } else {
      return {
        resumeUrl: `/uploads/generated/${docxName}`,
        pdfUrl: undefined,
      };
    }
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

  async getAllResumes(): Promise<Resume[]> {
    return this.resumeRepository.find({
      relations: ['developer'],
      order: { createdAt: 'DESC' },
    });
  }

  async convertResumeToPdf(id: string): Promise<Resume> {
    // Get the resume with developer info
    const resume = await this.resumeRepository.findOne({
      where: { id },
      relations: ['developer'],
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Check if PDF already exists
    if (resume.pdfUrl) {
      return resume; // PDF already exists, return as is
    }

    // Get the DOCX file path
    const docxPath = path.join(
      process.cwd(),
      resume.resumeUrl.replace('/uploads/', 'uploads/'),
    );

    if (!fs.existsSync(docxPath)) {
      throw new NotFoundException('DOCX file not found');
    }

    // Generate PDF file path
    const fileName = path.basename(docxPath, '.docx');
    const pdfName = `${fileName}.pdf`;
    const pdfPath = path.join(path.dirname(docxPath), pdfName);

    // Convert DOCX to PDF
    await DocxUtils.generatePDF(docxPath, pdfPath);

    // Update the resume with PDF URL
    resume.pdfUrl = `/uploads/generated/${pdfName}`;

    return this.resumeRepository.save(resume);
  }
}
