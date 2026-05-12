import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../lib/server/load-env.ts";
import { importRuntimeData } from "./import-runtime-data.ts";

loadLocalEnv();

const prisma = new PrismaClient();

async function main() {
  await importRuntimeData(prisma);
  console.log("Imported runtime data into PostgreSQL");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
