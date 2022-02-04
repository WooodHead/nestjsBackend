const path = require('path');
require('dotenv').config({ path: __dirname + '/.development.env' });

const config = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.resolve(__dirname, '..') + '/**/**/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: ['migrations/*.{js,ts}'],
  cli: {
    migrationsDir: 'migrations/',
  },
  logging: process.env.LOGGING === 'true' ? true : false,
};

export default config;
