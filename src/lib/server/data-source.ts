export function shouldUseMockData() {
  return process.env.USE_MOCK_DATA === "true";
}

export function hasDatabaseUrl() {
  return !shouldUseMockData() && Boolean(process.env.DATABASE_URL);
}
