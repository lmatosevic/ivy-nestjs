import { StringUtil } from '../utils';

export default () => ({
  env: process.env.NODE_ENV || 'production',
  app: {
    name: process.env.APP_NAME || 'Ivy API',
    description: process.env.APP_DESCRIPTION || 'Ivy backend API service',
    debug: StringUtil.parseBool(process.env.APP_DEBUG, false),
    version: process.env.npm_package_version || 'unknown',
    host: process.env.APP_HOST || '0.0.0.0',
    hostname: process.env.APP_HOSTNAME || '127.0.0.1',
    port: StringUtil.parseInteger(process.env.APP_PORT, 80),
    shutdownHooks: StringUtil.parseBool(process.env.APP_USE_SHUTDOWN_HOOKS, false),
    helmet: StringUtil.parseBool(process.env.APP_USE_HELMET, true)
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
    path: process.env.LOG_PATH === 'false' ? undefined : process.env.LOG_PATH || './logs',
    colorize: StringUtil.parseBool(process.env.LOG_COLORIZE, true),
    rotate: {
      enabled: StringUtil.parseBool(process.env.LOG_ROTATE_ENABLED, true),
      pattern: process.env.LOG_ROTATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_ROTATE_MAX_SIZE,
      maxFiles: process.env.LOG_ROTATE_MAX_FILES,
      zipArchive: StringUtil.parseBool(process.env.LOG_ROTATE_ZIP_ARCHIVE, false),
    }
  },
  storage: {
    rootDir: process.env.STORAGE_ROOT_DIR || './storage',
    filesRoute: process.env.STORAGE_FILES_ROUTE || 'files',
    filesAccess: process.env.STORAGE_FILES_ACCESS || 'all',
    filesDirname: process.env.STORAGE_FILES_DIRNAME || 'files',
    tempDirname: process.env.STORAGE_TEMP_DIRNAME || 'temp',
    cacheDuration: StringUtil.parseInteger(process.env.STORAGE_CACHE_DURATION, 86400)
  },
  db: {
    type: process.env.DB_TYPE || 'mongoose',
    host: process.env.DB_HOST || '127.0.0.1',
    port: StringUtil.parseInteger(process.env.DB_PORT, 27017),
    name: process.env.DB_NAME || 'ivy',
    schema: process.env.DB_SCHEMA || 'public',
    authSource: process.env.DB_AUTH_SOURCE || 'admin',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    logging:
      process.env.DB_LOGGING !== 'false'
        ? process.env.DB_LOGGING !== 'all'
          ? StringUtil.parseArray(process.env.DB_LOGGING, 'all')
          : 'all'
        : false,
    migration: {
      enabled: StringUtil.parseBool(process.env.DB_MIGRATION_ENABLED, true),
      autoRun: StringUtil.parseBool(process.env.DB_MIGRATION_AUTORUN, true),
      table: process.env.DB_MIGRATION_TABLE || 'migration',
      dirname: process.env.DB_MIGRATION_DIRNAME || 'migrations',
      sourceRoot: process.env.DB_MIGRATION_SOURCE_ROOT || './src',
      distRoot: process.env.DB_MIGRATION_DIST_ROOT || './dist',
    }
  },
  cors: {
    enabled: StringUtil.parseBool(process.env.CORS_ENABLED, true),
    origin: process.env.CORS_ORIGIN || '*',
    methods: StringUtil.parseArray(process.env.CORS_METHODS, ['*']),
    allowedHeaders: StringUtil.parseArray(process.env.CORS_ALLOWED_HEADERS, ['*']),
    exposedHeaders: StringUtil.parseArray(process.env.CORS_EXPOSED_HEADERS, ['*']),
    maxAge: StringUtil.parseInteger(process.env.CORS_MAX_AGE, 86400),
    credentials: StringUtil.parseBool(process.env.CORS_CREDENTIALS, true)
  },
  auth: {
    route: process.env.AUTH_ROUTE || 'auth',
    login: StringUtil.parseBool(process.env.AUTH_LOGIN_ENABLED, true),
    registration: StringUtil.parseBool(process.env.AUTH_REGISTRATION_ENABLED, true),
    admin: {
      create: StringUtil.parseBool(process.env.AUTH_ADMIN_CREATE, false),
      username: process.env.AUTH_ADMIN_USERNAME || 'admin@ivy',
      password: process.env.AUTH_ADMIN_PASSWORD
    },
    jwt: {
      enabled: StringUtil.parseBool(process.env.AUTH_JWT_ENABLED, true),
      expiresIn: StringUtil.parseInteger(process.env.AUTH_JWT_EXPIRES_IN, 2592000),
      secret: process.env.AUTH_JWT_SECRET
    },
    basic: {
      enabled: StringUtil.parseBool(process.env.AUTH_BASIC_ENABLED, false)
    },
    oauth2: {
      enabled: StringUtil.parseBool(process.env.AUTH_OAUTH2_ENABLED, false)
    },
    apikey: {
      enabled: StringUtil.parseBool(process.env.AUTH_APIKEY_ENABLED, false)
    },
    recaptcha: {
      enabled: StringUtil.parseBool(process.env.RECAPTCHA_ENABLED, false),
      siteSecret: process.env.RECAPTCHA_SITE_SECRET,
      deliveryHeader: process.env.RECAPTCHA_DELIVERY_HEADER || 'X-RECAPTCHA-TOKEN',
      deliveryQuery: process.env.RECAPTCHA_DELIVERY_QUERY || 'recaptcha_token',
      deliveryBody: process.env.RECAPTCHA_DELIVERY_BODY || 'recaptchaToken'
    },
    google: {
      enabled: StringUtil.parseBool(process.env.GOOGLE_ENABLED, false),
      clientId: process.env.GOOGLE_CLIENT_ID
    },
    facebook: {
      enabled: StringUtil.parseBool(process.env.FACEBOOK_ENABLED, false),
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    }
  },
  health: {
    route: process.env.HEALTH_ROUTE || 'health',
    memoryThreshold: StringUtil.parseInteger(process.env.HEALTH_MEMORY_THRESHOLD, 512),
    diskThreshold: StringUtil.parseFloat(process.env.HEALTH_DISK_THRESHOLD, 0.9)
  },
  rest: {
    enabled: StringUtil.parseBool(process.env.REST_ENABLED, true),
    swagger: StringUtil.parseBool(process.env.REST_SWAGGER_ENABLED, true)
  },
  graphql: {
    enabled: StringUtil.parseBool(process.env.GRAPHQL_ENABLED, true),
    playground: StringUtil.parseBool(process.env.GRAPHQL_PLAYGROUND_ENABLED, true)
  }
});
