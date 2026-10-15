import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required()
    .messages({
      'any.required':
        'Missing required environment variable: DATABASE_URL. Copy backend/.env.example to backend/.env and set a PostgreSQL connection string.',
      'string.uri':
        'DATABASE_URL must be a valid PostgreSQL connection URI (postgresql://...).',
    }),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  AUTH_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .default(60 * 60 * 24 * 7),
  ENABLE_DEV_AUTH: Joi.boolean().truthy('true').falsy('false').default(false),
  WECHAT_APP_ID: Joi.string().allow('').default(''),
  WECHAT_APP_SECRET: Joi.string().allow('').default(''),
});

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validation = envValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });

  if (validation.error) {
    const details = validation.error.details
      .map((detail) => `- ${detail.message}`)
      .join('\n');
    throw new Error(
      `Invalid application configuration. Fix the following and restart:\n${details}`,
    );
  }

  const value = validation.value as Record<string, unknown>;
  const nodeEnv = value.NODE_ENV as string;
  const enableDevAuth = Boolean(value.ENABLE_DEV_AUTH);

  if (nodeEnv === 'production' && enableDevAuth) {
    throw new Error(
      'Invalid application configuration. Fix the following and restart:\n- ENABLE_DEV_AUTH cannot be enabled when NODE_ENV=production.',
    );
  }

  if (nodeEnv === 'production') {
    if (!value.WECHAT_APP_ID) {
      throw new Error(
        'Invalid application configuration. Fix the following and restart:\n- Missing required environment variable: WECHAT_APP_ID (required in production).',
      );
    }
    if (!value.WECHAT_APP_SECRET) {
      throw new Error(
        'Invalid application configuration. Fix the following and restart:\n- Missing required environment variable: WECHAT_APP_SECRET (required in production).',
      );
    }
  }

  return value;
}
