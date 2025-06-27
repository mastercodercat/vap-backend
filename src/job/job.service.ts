import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobRepository.create(createJobDto);
    return this.jobRepository.save(job);
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
