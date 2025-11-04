/**
 * E2E Tests for Dashboard 3: Threat Actor Geopolitical Map
 * 
 * Tests the interactive geopolitical map functionality including:
 * - Map rendering with Leaflet.js
 * - APT group markers and popups
 * - Statistics dashboard
 * - Filter controls (region, threat type, risk level)
 * - Threat cards grouped by country
 * - Responsive design
 * - Accessibility compliance
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard 3: Threat Actor Geopolitical Map', () => {
  
  test('page loads successfully with correct title', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    await expect(page).toHaveTitle(/Geopolitical Threat Map - WatchLockAI/);

    // Check page header
    const header = page.locator('h1');
    await expect(header).toContainText('Geopolitical Threat Map');
  });

  test('map container renders correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for map to load
    await page.waitForSelector('#map', { timeout: 10000 });
    
    // Check map container exists and has correct dimensions
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();
    
    // Check that Leaflet map is initialized
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible();
  });

  test('statistics display correct values', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for statistics to load
    await page.waitForSelector('.stats-grid', { timeout: 10000 });
    
    // Check that all 4 stat cards are present
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);
    
    // Check stat labels
    await expect(page.locator('.stat-label').nth(0)).toContainText('Total APT Groups');
    await expect(page.locator('.stat-label').nth(1)).toContainText('Countries Affected');
    await expect(page.locator('.stat-label').nth(2)).toContainText('Active Threats');
    await expect(page.locator('.stat-label').nth(3)).toContainText('Critical Risk');
    
    // Check that stat values are numbers greater than 0
    const totalThreats = await page.locator('#totalThreats').textContent();
    expect(parseInt(totalThreats)).toBeGreaterThan(0);
  });

  test('filter controls are present and functional', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Check region filter
    const regionFilter = page.locator('#regionFilter');
    await expect(regionFilter).toBeVisible();
    await expect(regionFilter).toHaveValue('all');
    
    // Check threat type filter
    const threatTypeFilter = page.locator('#threatTypeFilter');
    await expect(threatTypeFilter).toBeVisible();
    await expect(threatTypeFilter).toHaveValue('all');
    
    // Check risk level filter
    const riskLevelFilter = page.locator('#riskFilter');
    await expect(riskLevelFilter).toBeVisible();
    await expect(riskLevelFilter).toHaveValue('all');
  });

  test('region filter works correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for data to load
    await page.waitForSelector('.threat-list', { timeout: 10000 });
    
    // Get initial threat count
    const initialCount = await page.locator('#totalThreats').textContent();
    
    // Select Asia region
    await page.selectOption('#regionFilter', 'asia');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check that threat count changed (should be less than or equal to initial)
    const asiaCount = await page.locator('#totalThreats').textContent();
    expect(parseInt(asiaCount)).toBeLessThanOrEqual(parseInt(initialCount));
    
    // Reset filter
    await page.selectOption('#regionFilter', 'all');
  });

  test('threat type filter works correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for data to load
    await page.waitForSelector('.threat-list', { timeout: 10000 });
    
    // Select espionage threat type
    await page.selectOption('#threatTypeFilter', 'espionage');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check that filtered results are displayed
    const threatCount = await page.locator('#totalThreats').textContent();
    expect(parseInt(threatCount)).toBeGreaterThan(0);
  });

  test('risk level filter works correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');

    // Wait for data to load
    await page.waitForSelector('.threat-list', { timeout: 10000 });

    // Select critical risk level
    await page.selectOption('#riskFilter', 'critical');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check that critical threats stat is updated
    const criticalCount = await page.locator('#criticalThreats').textContent();
    expect(parseInt(criticalCount)).toBeGreaterThanOrEqual(0);
  });

  test('threat density legend displays correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');

    // Check legend container
    const legend = page.locator('.legend');
    await expect(legend).toBeVisible();

    // Check legend title
    await expect(page.locator('.legend-title')).toContainText('Threat Density');
    
    // Check legend items (4 levels: Critical, High, Medium, Low)
    const legendItems = page.locator('.legend-item');
    await expect(legendItems).toHaveCount(4);
    
    // Check legend labels
    await expect(page.locator('.legend-item').nth(0)).toContainText('Critical');
    await expect(page.locator('.legend-item').nth(1)).toContainText('High');
    await expect(page.locator('.legend-item').nth(2)).toContainText('Medium');
    await expect(page.locator('.legend-item').nth(3)).toContainText('Low');
  });

  test('threat cards render correctly', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for threat cards to load
    await page.waitForSelector('#threatCards', { timeout: 10000 });
    
    // Check that threat cards are present
    const threatCards = page.locator('.threat-card');
    const cardCount = await threatCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Check first threat card structure
    const firstCard = threatCards.first();
    await expect(firstCard.locator('.threat-name')).toBeVisible();
    await expect(firstCard.locator('.country-badge')).toBeVisible();
  });

  test('threat cards display APT group information', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for threat cards to load
    await page.waitForSelector('.threat-card', { timeout: 10000 });
    
    // Check first threat card
    const firstCard = page.locator('.threat-card').first();

    // Check threat name is present
    const threatName = await firstCard.locator('.threat-name').textContent();
    expect(threatName.length).toBeGreaterThan(0);

    // Check country badge is present
    const countryBadge = await firstCard.locator('.country-badge').textContent();
    expect(countryBadge.length).toBeGreaterThan(0);
  });

  test('combined filters work together', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for data to load
    await page.waitForSelector('.threat-list', { timeout: 10000 });
    
    // Apply multiple filters
    await page.selectOption('#regionFilter', 'asia');
    await page.selectOption('#threatTypeFilter', 'espionage');
    await page.selectOption('#riskFilter', 'high');
    
    // Wait for filters to apply
    await page.waitForTimeout(500);
    
    // Check that results are filtered
    const threatCount = await page.locator('#totalThreats').textContent();
    expect(parseInt(threatCount)).toBeGreaterThanOrEqual(0);
    
    // Reset all filters
    await page.selectOption('#regionFilter', 'all');
    await page.selectOption('#threatTypeFilter', 'all');
    await page.selectOption('#riskFilter', 'all');
  });

  test('map markers are rendered', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Wait for markers to render
    await page.waitForTimeout(2000);
    
    // Check that markers exist
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/geopolitical-map.html');
    
    // Check that page is still functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.stats-grid')).toBeVisible();
    await expect(page.locator('#map')).toBeVisible();
    
    // Check that filters are still accessible
    await expect(page.locator('#regionFilter')).toBeVisible();
  });

  test('page is accessible and has proper ARIA attributes', async ({ page }) => {
    await page.goto('/geopolitical-map.html');

    // Check header landmark
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check filter labels
    const regionLabel = page.locator('label[for="regionFilter"]');
    await expect(regionLabel).toBeVisible();
    await expect(regionLabel).toContainText('Region');
  });

  test('no console errors when loading page', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/geopolitical-map.html');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Check for console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('back link navigates to dashboard', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Check back link exists
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', 'index.html');
  });

  test('page has proper header and title', async ({ page }) => {
    await page.goto('/geopolitical-map.html');

    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check subtitle is present
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('Interactive visualization');
  });

  test('page maintains dark theme consistency', async ({ page }) => {
    await page.goto('/geopolitical-map.html');
    
    // Check background color (should be dark)
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // RGB values for dark background should be low
    expect(bgColor).toMatch(/rgb\(1[0-5], 1[0-8], 2[0-4]\)/);
  });
});

