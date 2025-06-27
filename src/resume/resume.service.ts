import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { DocxUtils } from '../utils/docx.utils';
import { ConfigService } from '@nestjs/config';
import { FirebaseStorageService } from '../services/firebase-storage.service';
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
    private readonly firebaseStorageService: FirebaseStorageService,
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
    // Create temporary directory for file processing
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `auto-resume-${developer.id}-${Date.now()}`;
    const docxName = `${fileName}.docx`;
    const docxPath = path.join(tempDir, docxName);
    const pdfName = `${fileName}.pdf`;
    const pdfPath = path.join(tempDir, pdfName);

    // Extract information from original resume if available
    let extractedInformation = developer.information;

    const result = await DocxUtils.generateResume(
      jobDescription,
      developer.link || '', // Original resume URL for template
      extractedInformation, // Extracted text content
      docType === 'pdf',
      docxPath,
      pdfPath,
      this.firebaseStorageService, // Pass Firebase Storage service
      developer.id, // Pass developer ID
    );

    if (!result.success) {
      throw new Error('Failed to generate resume');
    }

    // Upload DOCX file to Firebase Storage
    const docxStoragePath = this.firebaseStorageService.generateStoragePath(
      developer.id,
      docxName,
    );
    const docxUrl = await this.firebaseStorageService.uploadFile(
      docxPath,
      docxStoragePath,
    );

    // Clean up temporary files
    try {
      fs.unlinkSync(docxPath);
      if (docType === 'pdf' && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (error) {
      console.warn('Could not delete temporary files:', error);
    }

    return {
      resumeUrl: docxUrl,
      pdfUrl: result.pdfUrl,
    };
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

    // Create temporary directory
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download DOCX file from Firebase Storage
    const docxFileName = `temp-docx-${Date.now()}.docx`;
    const docxPath = path.join(tempDir, docxFileName);

    // Extract storage path from URL
    const storagePath = this.extractStoragePathFromUrl(resume.resumeUrl);
    await this.firebaseStorageService.downloadFile(storagePath, docxPath);

    // Generate PDF file path
    const fileName = path.basename(docxPath, '.docx');
    const pdfName = `${fileName}.pdf`;
    const pdfPath = path.join(tempDir, pdfName);

    // Convert DOCX to PDF and upload to Firebase Storage
    const pdfUrl = await DocxUtils.generatePDF(
      docxPath,
      pdfPath,
      this.firebaseStorageService,
      resume.developerId,
    );

    // Clean up temporary files
    try {
      fs.unlinkSync(docxPath);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (error) {
      console.warn('Could not delete temporary files:', error);
    }

    // Update the resume with PDF URL
    resume.pdfUrl = pdfUrl;

    return this.resumeRepository.save(resume);
  }

  private extractStoragePathFromUrl(url: string): string {
    // Extract storage path from Firebase Storage URL
    // URL format: https://storage.googleapis.com/BUCKET_NAME/path/to/file
    const urlParts = url.split('/');
    const bucketNameIndex =
      urlParts.findIndex((part) => part.includes('storage.googleapis.com')) + 1;
    return urlParts.slice(bucketNameIndex + 1).join('/');
  }
}
