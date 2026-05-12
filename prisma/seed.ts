import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../lib/server/load-env.ts";
import { importRuntimeData } from "./import-runtime-data.ts";

loadLocalEnv();

const prisma = new PrismaClient();

async function main() {
  await importRuntimeData(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
