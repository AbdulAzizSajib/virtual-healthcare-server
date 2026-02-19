import app from "./app";
import { envVars } from "./config/env";
import { prisma } from "./lib/prisma";
import { seedSuperAdmin } from "./utils/seed";

async function main() {
  try {
    await seedSuperAdmin();
    await prisma.$connect();
    console.log("Database connected successfully.");

    app.listen(envVars.PORT, () => {
      console.log(`Server is running on port ${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Error during server startup:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
