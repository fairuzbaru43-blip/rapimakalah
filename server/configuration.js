export function resolveDatabaseUrl(environment = process.env) {
  return environment.NEON_POSTGRES_URL
    || environment.NEON_DATABASE_URL
    || environment.NEON_POSTGRES_URL_NON_POOLING
    || environment.NEON_URL
    || environment.DATABASE_URL;
}

export function shouldUseDatabaseSsl(environment = process.env) {
  if (environment.DATABASE_SSL === 'true') return true;

  return Boolean(
    environment.NEON_POSTGRES_URL
    || environment.NEON_DATABASE_URL
    || environment.NEON_POSTGRES_URL_NON_POOLING
    || environment.NEON_URL
  );
}
