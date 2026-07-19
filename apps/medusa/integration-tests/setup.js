const { loadEnv } = require("@medusajs/utils")

// Load the test environment (.env.test if present, otherwise process env).
// Unit tests need only this; integration tests additionally use a test database.
loadEnv("test", process.cwd())
