import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // process.env fallback allows `prisma generate` to succeed during CI/build
    // when DATABASE_URL is not yet injected (only needed at runtime)
    url: process.env.DATABASE_URL ?? "",
  },
});
