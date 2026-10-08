import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validate';
import { buildDataSourceOptions } from './data-source.options';

config({ path: process.env.ENV_FILE ?? '.env', quiet: true });

export const AppDataSource = new DataSource(buildDataSourceOptions(validateEnv(process.env)));
