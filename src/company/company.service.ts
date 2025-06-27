import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async createCompany(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  async getAllCompanies(): Promise<Company[]> {
    return this.companyRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getCompanyById(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async updateCompany(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.getCompanyById(id);

    // Update the company with new data
    Object.assign(company, updateCompanyDto);

    return this.companyRepository.save(company);
  }

  async deleteCompany(id: string): Promise<void> {
    const company = await this.getCompanyById(id);
    await this.companyRepository.remove(company);
  }
}
