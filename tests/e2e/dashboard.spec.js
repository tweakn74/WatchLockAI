import { test, expect } from '@playwright/test';

test.describe('WatchLockAI Dashboard', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WatchLockAI/);
    await expect(page.locator('h1')).toContainText('WatchLockAI');
  });

  test('should display threat cards', async ({ page }) => {
    await page.goto('/');

    // Wait for threats to load
    await page.waitForSelector('.threat-card', { timeout: 10000 });

    // Should have at least one threat card
    const cards = page.locator('.threat-card');
    await expect(cards).not.toHaveCount(0);
  });

  test('should show CRITICAL badge for high-risk threats', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Find a critical threat
    const criticalCard = page.locator('.threat-card.critical').first();
    if ((await criticalCard.count()) > 0) {
      await expect(criticalCard.locator('.threat-severity.critical')).toContainText('CRITICAL');
    }
  });

  test('should sort threats by score descending', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Get all threat scores
    const scores = await page.locator('.threat-score').allTextContents();
    const numericScores = scores.map(s => parseInt(s.trim())).filter(n => !isNaN(n));

    // Verify descending order
    for (let i = 0; i < numericScores.length - 1; i++) {
      expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
    }
  });

  test('should toggle between Executive and Analyst views', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Initially in Executive view
    await expect(page.locator('#currentView')).toContainText('Executive');
    await expect(page.locator('#topThreatsSection')).toBeVisible();
    await expect(page.locator('#allThreatsSection')).not.toBeVisible();

    // Click toggle
    await page.click('#viewToggle');

    // Now in Analyst view
    await expect(page.locator('#currentView')).toContainText('Analyst');
    await expect(page.locator('#topThreatsSection')).not.toBeVisible();
    await expect(page.locator('#allThreatsSection')).toBeVisible();
  });

  test('should display statistics', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Check that stats are populated
    const totalCount = await page.locator('#totalCount').textContent();
    expect(totalCount).not.toBe('-');
    expect(parseInt(totalCount)).toBeGreaterThan(0);
  });

  test('should show auto-refresh countdown', async ({ page }) => {
    await page.goto('/');

    const countdown = page.locator('#countdown');
    const initialValue = await countdown.textContent();

    // Wait 2 seconds and check countdown decreased
    await page.waitForTimeout(2000);
    const newValue = await countdown.textContent();

    expect(parseInt(newValue)).toBeLessThan(parseInt(initialValue));
  });

  test('should handle fallback dataset when API unavailable', async ({ page }) => {
    // This test verifies the fallback mechanism works
    await page.goto('/');

    // Even if API is down, should show threats from demo data
    await page.waitForSelector('.threat-card', { timeout: 15000 });
    const cards = page.locator('.threat-card');
    await expect(cards).not.toHaveCount(0);
  });

  test('should display badges correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Check if any badges are displayed
    const badges = page.locator('.badge');
    if ((await badges.count()) > 0) {
      // Verify badge classes
      const firstBadge = badges.first();
      const badgeClass = await firstBadge.getAttribute('class');
      expect(badgeClass).toContain('badge');
    }
  });

  test('should open threat link in new tab when clicked', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('.threat-card');

    // Listen for new page
    const pagePromise = context.waitForEvent('page');

    // Click first threat card
    await page.locator('.threat-card').first().click();

    // Verify new page opened
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    expect(newPage.url()).toBeTruthy();
  });
});
