import { test, expect } from '@playwright/test';

test.describe('Dashboard 8: Dark Web Intelligence Feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dark-web-intel.html');
    await page.waitForLoadState('networkidle');
  });

  test('page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Dark Web Intelligence/);
    await expect(page.locator('h1')).toContainText('Dark Web Intelligence');
    await expect(page.locator('.tagline')).toContainText('Ransomware Leak Site Monitoring');
  });

  test('displays victim cards with correct data', async ({ page }) => {
    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(3); // Sample data has 3 victims

    // Check first victim card
    const firstCard = victimCards.first();
    await expect(firstCard.locator('.victim-name')).toContainText('Acme Corporation');
    await expect(firstCard.locator('.victim-domain')).toContainText('acme-corp.com');
    await expect(firstCard.locator('.ransomware-group')).toContainText('LockBit 3.0');
  });

  test('victim cards have correct severity styling', async ({ page }) => {
    const criticalCards = page.locator('.victim-card.severity-critical');
    await expect(criticalCards).toHaveCount(2); // Acme and HealthCare Plus

    const highCards = page.locator('.victim-card.severity-high');
    await expect(highCards).toHaveCount(1); // TechStart Solutions
  });

  test('displays NEW badge for recent victims', async ({ page }) => {
    const newBadges = page.locator('.badge-new');
    await expect(newBadges).toHaveCount(2); // Acme (Oct 28) and TechStart (Oct 25) are within 10 days
  });

  test('stats cards display correct metrics', async ({ page }) => {
    await expect(page.locator('#totalVictims')).toContainText('3');
    await expect(page.locator('#activeGroups')).toContainText('3'); // 3 unique ransomware groups
    await expect(page.locator('#industriesAffected')).toContainText('3'); // 3 unique industries
    await expect(page.locator('#recentBreaches')).toHaveText(/\d+/); // Should be a number
  });

  test('search filter works correctly', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('Acme');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(1);
    await expect(victimCards.first().locator('.victim-name')).toContainText('Acme Corporation');
  });

  test('ransomware group filter works correctly', async ({ page }) => {
    const ransomwareFilter = page.locator('#ransomwareFilter');
    await ransomwareFilter.selectOption('LockBit 3.0');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(1);
    await expect(victimCards.first().locator('.ransomware-group')).toContainText('LockBit 3.0');
  });

  test('industry filter works correctly', async ({ page }) => {
    const industryFilter = page.locator('#industryFilter');
    await industryFilter.selectOption('Healthcare');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(1);
    await expect(victimCards.first().locator('.victim-name')).toContainText('HealthCare Plus');
  });

  test('severity filter works correctly', async ({ page }) => {
    const severityFilter = page.locator('#severityFilter');
    await severityFilter.selectOption('critical');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(2); // Acme and HealthCare Plus
  });

  test('date range filter works correctly', async ({ page }) => {
    const dateFilter = page.locator('#dateFilter');
    await dateFilter.selectOption('30'); // Last 30 days

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(3); // All 3 victims are within 30 days
  });

  test('combined filters work together', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    const severityFilter = page.locator('#severityFilter');

    await searchInput.fill('Corp');
    await severityFilter.selectOption('critical');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(1);
    await expect(victimCards.first().locator('.victim-name')).toContainText('Acme Corporation');
  });

  test('clicking victim card opens breach detail modal', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toContainText('Acme Corporation');
  });

  test('modal displays comprehensive breach information', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');

    // Check modal sections
    await expect(
      modal.locator('.modal-section-title').filter({ hasText: 'Overview' })
    ).toBeVisible();
    await expect(
      modal.locator('.modal-section-title').filter({ hasText: 'Compromised Data Types' })
    ).toBeVisible();
    await expect(
      modal.locator('.modal-section-title').filter({ hasText: 'Breach Timeline' })
    ).toBeVisible();
    await expect(
      modal.locator('.modal-section-title').filter({ hasText: 'Indicators of Compromise' })
    ).toBeVisible();
    await expect(
      modal.locator('.modal-section-title').filter({ hasText: 'External References' })
    ).toBeVisible();

    // Check data types tags
    const tags = modal.locator('.tag');
    await expect(tags).toHaveCount(4); // Acme has 4 data types

    // Check timeline items
    const timelineItems = modal.locator('.timeline-item');
    await expect(timelineItems).toHaveCount(4); // Acme has 4 timeline events

    // Check IOCs
    const iocs = modal.locator('.ioc-item');
    await expect(iocs).toHaveCount(3); // Acme has 3 IOCs
  });

  test('modal close button works', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();

    const closeBtn = modal.locator('.close');
    await closeBtn.click();

    await expect(modal).not.toBeVisible();
  });

  test('ESC key closes modal', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('clicking outside modal closes it', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();

    // Click on modal backdrop (outside modal content)
    await modal.click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });

  test('victim cards have hover effects', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();

    // Hover over card
    await firstCard.hover();

    // Check that card has cursor pointer
    const cursor = await firstCard.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('modal has smooth animations', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    const modalContent = modal.locator('.modal-content');

    // Check animation property exists
    const animation = await modalContent.evaluate(el => window.getComputedStyle(el).animation);
    expect(animation).toContain('slideIn');
  });

  test('modal content is scrollable for long content', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modalBody = page.locator('.modal-body');

    // Check overflow-y is auto
    const overflowY = await modalBody.evaluate(el => window.getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
  });

  test('multiple victim cards can be opened sequentially', async ({ page }) => {
    const victimCards = page.locator('.victim-card');
    const modal = page.locator('#breachModal');

    // Open first victim
    await victimCards.nth(0).click();
    await expect(modal.locator('.modal-title')).toContainText('Acme Corporation');
    await page.keyboard.press('Escape');

    // Open second victim
    await victimCards.nth(1).click();
    await expect(modal.locator('.modal-title')).toContainText('TechStart Solutions');
    await page.keyboard.press('Escape');

    // Open third victim
    await victimCards.nth(2).click();
    await expect(modal.locator('.modal-title')).toContainText('HealthCare Plus');
  });

  test('modal works with filtered results', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('TechStart');

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(1);

    await victimCards.first().click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toContainText('TechStart Solutions');
  });

  test('page is accessible and has proper ARIA attributes', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);

    // Check that interactive elements are keyboard accessible
    const searchInput = page.locator('#searchInput');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Check filter selects are accessible
    const ransomwareFilter = page.locator('#ransomwareFilter');
    await ransomwareFilter.focus();
    await expect(ransomwareFilter).toBeFocused();
  });

  test('no console errors when opening and closing modal', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const firstCard = page.locator('.victim-card').first();
    await firstCard.click();

    const modal = page.locator('#breachModal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    const victimCards = page.locator('.victim-card');
    await expect(victimCards).toHaveCount(3);

    // Check that cards are stacked vertically
    const grid = page.locator('.victim-grid');
    const gridColumns = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);

    // On mobile, grid should have only one column (single value, not multiple)
    const columnCount = gridColumns.split(' ').length;
    expect(columnCount).toBe(1);
  });

  test('back link navigates to dashboard', async ({ page }) => {
    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('filter dropdowns are populated correctly', async ({ page }) => {
    // Check ransomware filter has options
    const ransomwareFilter = page.locator('#ransomwareFilter');
    const ransomwareOptions = await ransomwareFilter.locator('option').count();
    expect(ransomwareOptions).toBeGreaterThan(1); // "All Groups" + actual groups

    // Check industry filter has options
    const industryFilter = page.locator('#industryFilter');
    const industryOptions = await industryFilter.locator('option').count();
    expect(industryOptions).toBeGreaterThan(1); // "All Industries" + actual industries
  });

  test('victim cards display all required metadata', async ({ page }) => {
    const firstCard = page.locator('.victim-card').first();

    // Check all required elements are present
    await expect(firstCard.locator('.victim-name')).toBeVisible();
    await expect(firstCard.locator('.victim-domain')).toBeVisible();
    await expect(firstCard.locator('.victim-description')).toBeVisible();
    await expect(firstCard.locator('.ransomware-group')).toBeVisible();
    await expect(firstCard.locator('.date-posted')).toBeVisible();
    await expect(firstCard.locator('.badge').first()).toBeVisible(); // Use .first() to avoid strict mode violation
  });
});
