import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  DEEPSEEK_API_KEY: z
    .string()
    .min(1)
    .default('development-key-not-for-production'),
  DEEPSEEK_BASE_URL: z.url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().min(1).default('deepseek-v4-flash'),
  DEEPSEEK_ENABLE_THINKING_FOR_ANSWERS: booleanString.default(false),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120_000)
    .default(30_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

export type Environment = z.infer<typeof envSchema>;

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): Environment {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success)
    throw new Error(
      `Invalid server configuration: ${z.prettifyError(parsed.error)}`,
    );
  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.DEEPSEEK_API_KEY === 'development-key-not-for-production'
  ) {
    throw new Error('DEEPSEEK_API_KEY must be configured in production.');
  }
  return parsed.data;
}
