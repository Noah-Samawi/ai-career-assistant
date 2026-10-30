process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/jobpilot_test";
process.env.FILE_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.STORAGE_DIR ??= "./.test-storage";
process.env.AI_PROVIDER = "none";
