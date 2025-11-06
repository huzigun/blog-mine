export default () => ({
  app: {
    name: process.env.APP_NAME || 'blog-mine-backend',
    version: process.env.APP_VERSION || '0.0.1',
    env: process.env.NODE_ENV || 'development',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  seedUser: {
    email: process.env.SEED_USER_EMAIL,
    name: process.env.SEED_USER_NAME,
    password: process.env.SEED_USER_PASSWORD,
  },
});
