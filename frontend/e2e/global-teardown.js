// Global teardown for Playwright tests
async function globalTeardown(config) {
  console.log('🧹 Starting Playwright global teardown...');
  
  // Clean up test data, stop services, etc.
  // For example:
  // - Clear test database
  // - Clean up temporary files
  // - Stop external services
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
