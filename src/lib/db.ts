import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl =
  process.env.DATABASE_URL ?? "mysql://root:@127.0.0.1:3306/currykitchen_next";

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function mariaDbConfigFromUrl(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;

  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: numberFromEnv("DB_CONNECTION_LIMIT", 3),
    connectTimeout: numberFromEnv("DB_CONNECT_TIMEOUT_MS", 1_500),
    acquireTimeout: numberFromEnv("DB_ACQUIRE_TIMEOUT_MS", 1_500),
    idleTimeout: numberFromEnv("DB_IDLE_TIMEOUT_SECONDS", 300),
  };
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(mariaDbConfigFromUrl(databaseUrl)),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
