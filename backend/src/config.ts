/**
 * Centralized, typed access to environment configuration. Reading process.env in
 * exactly one place keeps env coupling out of the rest of the codebase and makes
 * the required variables easy to find. Dev-friendly fallbacks are provided; the
 * security-sensitive ones (cookie secret, credentials) MUST be overridden in prod.
 */
export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  // In production set WEB_ORIGIN to the exact frontend origin (required for
  // credentialed CORS). In dev, `true` reflects the request origin.
  webOrigin: process.env.WEB_ORIGIN ?? true,
  cookieSecret: process.env.COOKIE_SECRET ?? 'dev-insecure-cookie-secret-change-me',
  auth: {
    username: process.env.AUTH_USERNAME ?? 'admin',
    password: process.env.AUTH_PASSWORD ?? 'admin',
  },
};
