import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import * as path from 'path';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  public createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [path.resolve(__dirname, '..') + '/**/**/**/*.entity{.ts,.js}'],
      synchronize: true,
      cli: {
        entitiesDir: 'src',
        migrationsDir: 'src/migration',
        subscribersDir: '',
      },
      migrations: ['src/migration/*.{js,ts}'],
      logging: process.env.LOGGING === 'true' ? true : false,
    };
  }
}
