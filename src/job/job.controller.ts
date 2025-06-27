import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job } from '../entities/job.entity';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  async createJob(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return this.jobService.createJob(createJobDto);
  }

  @Post('from-description')
  async createJobFromDescription(
    @Body() body: { jobDescription: string },
  ): Promise<Job> {
    return this.jobService.createJobFromDescription(body.jobDescription);
  }

  @Post('from-descriptions')
  async createJobsFromDescriptions(
    @Body() body: { jobDescriptions: string[] },
  ): Promise<{ created: Job[]; existing: Job[] }> {
    return this.jobService.createJobsFromDescriptions(body.jobDescriptions);
  }

  @Get()
  async getAllJobs(): Promise<Job[]> {
    return this.jobService.getAllJobs();
  }

  @Get('search')
  async searchJobs(@Query('q') query: string): Promise<Job[]> {
    if (!query) {
      return this.jobService.getAllJobs();
    }
    return this.jobService.searchJobs(query);
  }

  @Get('company/:companyId')
  async getJobsByCompany(
    @Param('companyId') companyId: string,
  ): Promise<Job[]> {
    return this.jobService.getJobsByCompany(companyId);
  }

  @Get(':id')
  async getJobById(@Param('id') id: string): Promise<Job> {
    return this.jobService.getJobById(id);
  }

  @Put(':id')
  async updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    return this.jobService.updateJob(id, updateJobDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(@Param('id') id: string): Promise<void> {
    return this.jobService.deleteJob(id);
  }
}
