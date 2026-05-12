import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "./load-env.ts";
import { logServerRuntimeOnce } from "./runtime-config.ts";

loadLocalEnv();
logServerRuntimeOnce();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
