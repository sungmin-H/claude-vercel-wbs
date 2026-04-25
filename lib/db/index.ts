import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { sql: postgres.Sql };

// dev 환경 핫 리로드 시 커넥션 누수 방지
const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
