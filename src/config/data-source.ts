import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Resume } from '../entities/resume.entity';
import { Developer } from '../entities/developer.entity';
import { User } from '../entities/user.entity';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'vap'),
  entities: [Resume, Developer, User],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: configService.get('NODE_ENV') !== 'production',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
