import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { Company } from '../entities/company.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { DocxUtils } from '../utils/docx.utils';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobRepository.create(createJobDto);
    return this.jobRepository.save(job);
  }

  async createJobFromExtractedInfo(extractedInfo: {
    title: string;
    skills: string;
    companyName: string;
    companyDescription: string;
    url: string;
    jobDescription: string;
    source: string;
  }): Promise<Job> {
    // Find or create company (case insensitive search)
    let company = await this.companyRepository
      .createQueryBuilder('company')
      .where('LOWER(company.name) = LOWER(:name)', {
        name: extractedInfo.companyName,
      })
      .getOne();

    if (!company) {
      // Create new company
      company = this.companyRepository.create({
        name: extractedInfo.companyName,
        description: extractedInfo.companyDescription,
      });
      company = await this.companyRepository.save(company);
      console.log(`✅ Created new company: ${company.name}`);
    } else {
      console.log(`✅ Found existing company: ${company.name}`);
    }

    // Check for existing job with same URL or description (case insensitive)
    let existingJob: Job | null = null;

    if (extractedInfo.url) {
      // First try to find by URL (case insensitive)
      existingJob = await this.jobRepository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company')
        .where('LOWER(job.url) = LOWER(:url)', { url: extractedInfo.url })
        .getOne();
    }

    if (!existingJob && extractedInfo.jobDescription) {
      // If no match by URL, try to find by description (case insensitive)
      existingJob = await this.jobRepository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.company', 'company')
        .where('LOWER(job.description) = LOWER(:description)', {
          description: extractedInfo.jobDescription,
        })
        .getOne();
    }

    if (existingJob) {
      console.log(
        `✅ Found existing job: ${existingJob.title} at ${existingJob.company?.name}`,
      );
      return existingJob;
    }

    // Create new job with extracted information
    const job = this.jobRepository.create({
      title: extractedInfo.title,
      description: extractedInfo.jobDescription,
      skills: extractedInfo.skills,
      companyId: company.id,
      url: extractedInfo.url,
      source: extractedInfo.source,
    });

    const savedJob = await this.jobRepository.save(job);
    console.log(`✅ Created new job: ${savedJob.title} at ${company.name}`);

    return savedJob;
  }

  async createJobFromDescription(jobDescription: string): Promise<Job> {
    // Extract job information using AI
    const extractedInfo = await DocxUtils.extractJobInformation(jobDescription);

    return this.createJobFromExtractedInfo({
      ...extractedInfo,
      jobDescription,
    });
  }

  async createJobsFromDescriptions(
    jobDescriptions: string[],
  ): Promise<{ created: Job[]; existing: Job[] }> {
    const created: Job[] = [];
    const existing: Job[] = [];

    for (const description of jobDescriptions) {
      try {
        const job = await this.createJobFromDescription(description);

        // Check if this is a newly created job or existing one
        // We can determine this by checking if the job was just created
        const isNewlyCreated = job.createdAt.getTime() > Date.now() - 5000; // Within 5 seconds

        if (isNewlyCreated) {
          created.push(job);
        } else {
          existing.push(job);
        }
      } catch (error) {
        console.error(`❌ Error processing job description: ${error.message}`);
      }
    }

    console.log(
      `✅ Processed ${jobDescriptions.length} job descriptions: ${created.length} created, ${existing.length} existing`,
    );

    return { created, existing };
  }

  async getAllJobs(): Promise<Job[]> {
    return this.jobRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async getJobsByCompany(companyId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { companyId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async getJobById(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async updateJob(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.getJobById(id);

    // Update the job with new data
    Object.assign(job, updateJobDto);

    return this.jobRepository.save(job);
  }

  async deleteJob(id: string): Promise<void> {
    const job = await this.getJobById(id);
    await this.jobRepository.remove(job);
  }

  async searchJobs(query: string): Promise<Job[]> {
    return this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where(
        'job.title ILIKE :query OR job.description ILIKE :query OR job.skills ILIKE :query',
        { query: `%${query}%` },
      )
      .orderBy('job.createdAt', 'DESC')
      .getMany();
  }
}
