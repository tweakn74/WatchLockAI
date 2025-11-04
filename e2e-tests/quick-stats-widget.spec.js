/**
 * E2E Tests for Quick Stats Widget (Dashboard 4)
 * Verifies the 6-metric card grid on APT Profiles and Detection Engineering pages
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Stats Widget - Dashboard 4', () => {
  test('APT Profiles page displays Quick Stats Widget correctly', async ({ page }) => {
    await page.goto('/apt-profiles.html');

    // Wait for page to load
    await page.waitForSelector('.quick-stats-grid', { timeout: 10000 });

    // Verify Quick Stats Grid exists
    const quickStatsGrid = page.locator('.quick-stats-grid');
    await expect(quickStatsGrid).toBeVisible();

    // Verify all 6 stat cards are present
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(6);

    // Verify APT Groups card
    const aptGroupsCard = page.locator('.stat-card.stat-blue');
    await expect(aptGroupsCard).toBeVisible();
    await expect(aptGroupsCard.locator('.stat-icon')).toHaveText('🎯');
    await expect(aptGroupsCard.locator('.stat-label')).toContainText('APT Groups');
    const aptGroupsCount = await aptGroupsCard.locator('.stat-number').textContent();
    expect(parseInt(aptGroupsCount)).toBe(8);

    // Verify Countries card
    const countriesCard = page.locator('.stat-card.stat-green');
    await expect(countriesCard).toBeVisible();
    await expect(countriesCard.locator('.stat-icon')).toHaveText('🌍');
    await expect(countriesCard.locator('.stat-label')).toContainText('Countries');
    const countriesCount = await countriesCard.locator('.stat-number').textContent();
    expect(parseInt(countriesCount)).toBeGreaterThan(0);

    // Verify Detections card
    const detectionsCard = page.locator('.stat-card.stat-purple');
    await expect(detectionsCard).toBeVisible();
    await expect(detectionsCard.locator('.stat-icon')).toHaveText('🛡️');
    await expect(detectionsCard.locator('.stat-label')).toContainText('Detections');
    await expect(detectionsCard.locator('.stat-number')).toHaveText('15');

    // Verify Critical card
    const criticalCard = page.locator('.stat-card.stat-red');
    await expect(criticalCard).toBeVisible();
    await expect(criticalCard.locator('.stat-icon')).toHaveText('🔴');
    await expect(criticalCard.locator('.stat-label')).toContainText('Critical');
    await expect(criticalCard.locator('.stat-number')).toHaveText('5');

    // Verify High card
    const highCard = page.locator('.stat-card.stat-orange');
    await expect(highCard).toBeVisible();
    await expect(highCard.locator('.stat-icon')).toHaveText('🟠');
    await expect(highCard.locator('.stat-label')).toContainText('High');
    await expect(highCard.locator('.stat-number')).toHaveText('9');

    // Verify Techniques card
    const techniquesCard = page.locator('.stat-card.stat-cyan');
    await expect(techniquesCard).toBeVisible();
    await expect(techniquesCard.locator('.stat-icon')).toHaveText('📊');
    await expect(techniquesCard.locator('.stat-label')).toContainText('Techniques');
    await expect(techniquesCard.locator('.stat-number')).toHaveText('22');
  });

  test('Detection Engineering page displays Quick Stats Widget correctly', async ({ page }) => {
    await page.goto('/detections.html');

    // Wait for page to load
    await page.waitForSelector('.quick-stats-grid', { timeout: 10000 });

    // Verify Quick Stats Grid exists
    const quickStatsGrid = page.locator('.quick-stats-grid');
    await expect(quickStatsGrid).toBeVisible();

    // Verify all 6 stat cards are present within the quick-stats-grid
    const statCards = quickStatsGrid.locator('.stat-card');
    await expect(statCards).toHaveCount(6);

    // Verify all cards have correct structure
    const aptGroupsCard = quickStatsGrid.locator('.stat-card.stat-blue');
    await expect(aptGroupsCard).toBeVisible();

    const countriesCard = quickStatsGrid.locator('.stat-card.stat-green');
    await expect(countriesCard).toBeVisible();

    const detectionsCard = quickStatsGrid.locator('.stat-card.stat-purple');
    await expect(detectionsCard).toBeVisible();

    const criticalCard = quickStatsGrid.locator('.stat-card.stat-red');
    await expect(criticalCard).toBeVisible();

    const highCard = quickStatsGrid.locator('.stat-card.stat-orange');
    await expect(highCard).toBeVisible();

    const techniquesCard = quickStatsGrid.locator('.stat-card.stat-cyan');
    await expect(techniquesCard).toBeVisible();
  });

  test('Quick Stats Widget has hover effects', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForSelector('.quick-stats-grid');

    // Get the first stat card
    const firstCard = page.locator('.stat-card').first();

    // Hover over the card
    await firstCard.hover();

    // Verify the card has the hover class or effect (check for transform)
    const transform = await firstCard.evaluate(el => {
      return window.getComputedStyle(el).transform;
    });

    // The card should have a transform applied (translateY)
    expect(transform).not.toBe('none');
  });

  test('Quick Stats Widget is responsive', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/apt-profiles.html');
    await page.waitForSelector('.quick-stats-grid');

    // Verify grid is visible on mobile
    const quickStatsGrid = page.locator('.quick-stats-grid');
    await expect(quickStatsGrid).toBeVisible();

    // Verify all cards are still visible
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(6);

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(quickStatsGrid).toBeVisible();
    await expect(statCards).toHaveCount(6);

    // Test on desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(quickStatsGrid).toBeVisible();
    await expect(statCards).toHaveCount(6);
  });

  test('Quick Stats Widget displays correct data after filtering', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForSelector('.quick-stats-grid');

    // Get initial APT Groups count
    const initialCount = await page.locator('#aptGroupsCount').textContent();
    expect(parseInt(initialCount)).toBe(8);

    // Apply a filter (e.g., filter by country)
    await page.selectOption('#countryFilter', 'Russia');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // APT Groups count should still be 8 (Quick Stats shows total, not filtered)
    const afterFilterCount = await page.locator('#aptGroupsCount').textContent();
    expect(parseInt(afterFilterCount)).toBe(8);

    // Verify the grid shows filtered results (fewer cards)
    const aptCards = page.locator('.apt-card');
    const cardCount = await aptCards.count();
    expect(cardCount).toBeLessThan(8);
  });

  test('Quick Stats Widget color variants are applied correctly', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForSelector('.quick-stats-grid');

    // Verify each card has the correct color class
    await expect(page.locator('.stat-card.stat-blue')).toBeVisible();
    await expect(page.locator('.stat-card.stat-green')).toBeVisible();
    await expect(page.locator('.stat-card.stat-purple')).toBeVisible();
    await expect(page.locator('.stat-card.stat-red')).toBeVisible();
    await expect(page.locator('.stat-card.stat-orange')).toBeVisible();
    await expect(page.locator('.stat-card.stat-cyan')).toBeVisible();

    // Verify border-left colors are applied
    const blueCard = page.locator('.stat-card.stat-blue');
    const borderColor = await blueCard.evaluate(el => {
      return window.getComputedStyle(el).borderLeftColor;
    });
    
    // Border should have a color (not transparent or none)
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(borderColor).not.toBe('transparent');
  });
});

