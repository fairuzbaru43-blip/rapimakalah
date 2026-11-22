export function resolveDatabaseUrl(environment = process.env) {
  return environment.NEON_URL || environment.DATABASE_URL;
}
