import { test as base } from '@playwright/test';

// Test fixtures for common test data and utilities
export const test = base.extend({
  // Authentication fixture
  authenticatedPage: async ({ page }, use) => {
    // Mock authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await use(page);
  },

  // Test user data fixture
  testUser: async ({}, use) => {
    const user = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'user'
    };
    await use(user);
  },

  // Admin user fixture
  adminUser: async ({}, use) => {
    const admin = {
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin'
    };
    await use(admin);
  },

  // Test election data fixture
  testElection: async ({}, use) => {
    const election = {
      title: 'Test Election 2024',
      description: 'A test election for E2E testing',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      candidates: [
        { name: 'Candidate 1', description: 'First candidate' },
        { name: 'Candidate 2', description: 'Second candidate' }
      ]
    };
    await use(election);
  },

  // Mobile viewport fixture
  mobilePage: async ({ page }, use) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await use(page);
  },

  // Tablet viewport fixture
  tabletPage: async ({ page }, use) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await use(page);
  }
});

export { expect } from '@playwright/test';
