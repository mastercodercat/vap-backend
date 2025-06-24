import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ResumeService } from './resume.service';

@ApiTags('Resumes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate automatic resume based on job description',
  })
  @ApiResponse({ status: 201, description: 'Resume generated successfully' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  async generateAutomaticResume(
    @Request() req,
    @Body()
    body: {
      jobDescription: string;
      developerId: string;
      docType: 'pdf' | 'docx';
    },
  ) {
    const resume = await this.resumeService.createAutomaticResume(
      body.jobDescription,
      body.developerId,
      body.docType,
    );

    return {
      id: resume.id,
      jobDescription: resume.jobDescription,
      title: resume.title,
      skills: resume.skills,
      resumeUrl: resume.resumeUrl,
      pdfUrl: resume.pdfUrl,
      developerId: resume.developerId,
      createdAt: resume.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  @ApiResponse({
    status: 200,
    description: 'All resumes retrieved successfully',
  })
  async getAllResumes() {
    const resumes = await this.resumeService.getAllResumes();

    return resumes.map((resume) => ({
      id: resume.id,
      jobDescription: resume.jobDescription,
      title: resume.title,
      skills: resume.skills,
      resumeUrl: resume.resumeUrl,
      pdfUrl: resume.pdfUrl,
      developerId: resume.developerId,
      createdAt: resume.createdAt,
      developer: resume.developer
        ? {
            id: resume.developer.id,
            name: resume.developer.name,
            link: resume.developer.link,
          }
        : null,
    }));
  }

  @Get('developer/:developerId')
  @ApiOperation({ summary: 'Get all resumes for a specific developer' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  async getResumesByDeveloper(@Param('developerId') developerId: string) {
    const resumes =
      await this.resumeService.getResumesByDeveloperId(developerId);

    return resumes.map((resume) => ({
      id: resume.id,
      jobDescription: resume.jobDescription,
      title: resume.title,
      skills: resume.skills,
      resumeUrl: resume.resumeUrl,
      developerId: resume.developerId,
      createdAt: resume.createdAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume by ID' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResume(@Param('id') id: string) {
    const resume = await this.resumeService.getResumeById(id);

    return {
      id: resume.id,
      jobDescription: resume.jobDescription,
      title: resume.title,
      skills: resume.skills,
      resumeUrl: resume.resumeUrl,
      pdfUrl: resume.pdfUrl,
      developerId: resume.developerId,
      createdAt: resume.createdAt,
      developer: resume.developer
        ? {
            id: resume.developer.id,
            name: resume.developer.name,
            link: resume.developer.link,
          }
        : null,
    };
  }
}
