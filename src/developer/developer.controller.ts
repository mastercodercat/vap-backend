import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DeveloperService } from './developer.service';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { DocxUtils } from 'src/utils/docx.utils';

@ApiTags('Developers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('developers')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new developer profile with resume upload',
  })
  @ApiResponse({ status: 201, description: 'Developer created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume'))
  async createDeveloper(
    @Request() req,
    @Body('name') name: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: '.(pdf|doc|docx)',
          }),
        ],
        fileIsRequired: false,
      }),
    )
    resumeFile?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    const developer = await this.developerService.createDeveloper(
      name,
      userId,
      resumeFile,
    );

    return {
      id: developer.id,
      name: developer.name,
      link: developer.link,
      // information: resumeText,
      createdAt: developer.createdAt,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update an existing developer profile with optional resume upload',
  })
  @ApiResponse({ status: 200, description: 'Developer updated successfully' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('resume'))
  async updateDeveloper(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDeveloperDto: UpdateDeveloperDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: '.(pdf|doc|docx)',
          }),
        ],
        fileIsRequired: false,
      }),
    )
    resumeFile?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    const developer = await this.developerService.updateDeveloperWithResume(
      id,
      userId,
      updateDeveloperDto,
      resumeFile,
    );

    return {
      id: developer.id,
      name: developer.name,
      link: developer.link,
      createdAt: developer.createdAt,
      updatedAt: developer.updatedAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all developers for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Developers retrieved successfully',
  })
  async getDevelopers(@Request() req) {
    const userId = req.user.userId;
    const developers =
      await this.developerService.getDevelopersByUserId(userId);

    return developers.map((developer) => ({
      id: developer.id,
      name: developer.name,
      link: developer.link,
      createdAt: developer.createdAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific developer by ID' })
  @ApiResponse({ status: 200, description: 'Developer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Developer not found' })
  async getDeveloper(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const developer = await this.developerService.getDeveloperById(id, userId);

    return {
      id: developer.id,
      name: developer.name,
      link: developer.link,
      createdAt: developer.createdAt,
    };
  }
}
