import 'dotenv/config';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
export const config = {
  jwtSecret: requireEnv('JWT_SECRET'),
  db: {
    host: requireEnv('DB_HOST'),
    user: requireEnv('DB_USER'),
    pass: requireEnv('DB_PASS'),
    name: requireEnv('DB_NAME'),
    port: parseInt(process.env.DB_PORT || '5432', 10),
  },
};
