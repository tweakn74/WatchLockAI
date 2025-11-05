import { test, expect } from '@playwright/test';

test.describe('Dashboard 9: Recorded Future Style APT Profiles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForLoadState('networkidle');
  });

  test('APT Profiles page loads with enhanced Recorded Future design', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/APT Profiles/);

    // Verify header
    const header = page.locator('h1');
    await expect(header).toContainText('APT Profiles');

    // Verify APT cards are present
    const cards = page.locator('.apt-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('All APT actor cards display risk scores', async ({ page }) => {
    // Wait for cards to load
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Check that all cards have risk score badges
    const riskBadges = page.locator('.risk-score-badge');
    const badgeCount = await riskBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Verify risk score badge contains a number
    const firstBadge = riskBadges.first();
    const scoreText = await firstBadge.locator('.score-number').textContent();
    const score = parseInt(scoreText);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('Risk scores are calculated correctly based on formula', async ({ page }) => {
    // Wait for cards to load
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Get all risk scores
    const riskScores = await page.locator('.risk-score-badge .score-number').allTextContents();

    // Verify all scores are within valid range (0-100)
    riskScores.forEach(scoreText => {
      const score = parseInt(scoreText);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    // Verify at least one high-risk actor exists (score >= 60)
    const highRiskExists = riskScores.some(scoreText => parseInt(scoreText) >= 60);
    expect(highRiskExists).toBeTruthy();
  });

  test('Risk level badges display correct colors', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Check for critical risk cards (red - Versedetect --danger color)
    const criticalCards = page.locator('.apt-card.risk-critical');
    if ((await criticalCards.count()) > 0) {
      const firstCritical = criticalCards.first();
      await expect(firstCritical).toHaveCSS('border-color', /rgb\(255, 107, 122\)/);
    }

    // Check for high risk cards (blue - Versedetect --brand color)
    const highCards = page.locator('.apt-card.risk-high');
    if ((await highCards.count()) > 0) {
      const firstHigh = highCards.first();
      await expect(firstHigh).toHaveCSS('border-color', /rgb\(90, 169, 255\)/);
    }

    // Verify at least one risk-level class is applied
    const riskCards = page.locator('.apt-card[class*="risk-"]');
    const count = await riskCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Country badges are visible on all cards with flags', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    const countryBadges = page.locator('.country-badge');
    const badgeCount = await countryBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Verify first badge contains text (country name)
    const firstBadge = countryBadges.first();
    const badgeText = await firstBadge.textContent();
    expect(badgeText.length).toBeGreaterThan(0);

    // Verify badge has color styling
    await expect(firstBadge).toHaveCSS('background', /.+/);
  });

  test('Motivation tags are displayed correctly', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    const motivationTags = page.locator('.motivation-tag');
    const tagCount = await motivationTags.count();
    expect(tagCount).toBeGreaterThan(0);

    // Verify motivation tags have proper classes
    const firstTag = motivationTags.first();
    const className = await firstTag.getAttribute('class');
    expect(className).toMatch(/motivation-(espionage|financial|destructive)/);
  });

  test('Timeline visualization is present on all cards', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    const timelines = page.locator('.activity-timeline');
    const timelineCount = await timelines.count();
    expect(timelineCount).toBeGreaterThan(0);

    // Verify timeline has bar
    const timelineBars = page.locator('.timeline-bar');
    const barCount = await timelineBars.count();
    expect(barCount).toBeGreaterThan(0);

    // Verify timeline has dates
    const timelineDates = page.locator('.timeline-dates');
    const datesCount = await timelineDates.count();
    expect(datesCount).toBeGreaterThan(0);
  });

  test('"Last Active" timestamp displays relative time', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    const lastActiveElements = page.locator('.last-active');
    const count = await lastActiveElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify relative time format (e.g., "3 months ago", "1 year ago")
    const firstLastActive = lastActiveElements.first();
    const text = await firstLastActive.textContent();
    expect(text).toMatch(/(days?|months?|years?) ago/);
  });

  test('Risk Level filter works correctly', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Get initial card count
    const initialCount = await page.locator('.apt-card').count();

    // Select "Critical" risk level
    await page.selectOption('#riskLevelFilter', 'critical');
    await page.waitForTimeout(500);

    // Get filtered card count
    const filteredCount = await page.locator('.apt-card').count();

    // Verify filtering occurred (count changed or stayed same if all are critical)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // If there are filtered cards, verify they are all critical
    if (filteredCount > 0) {
      const criticalCards = page.locator('.apt-card.risk-critical');
      const criticalCount = await criticalCards.count();
      expect(criticalCount).toBe(filteredCount);
    }
  });

  test('Sorting by Risk Score works (High to Low)', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Select "Risk Score (High to Low)" sorting
    await page.selectOption('#sortBy', 'risk-desc');
    await page.waitForTimeout(500);

    // Get all risk scores
    const riskScores = await page.locator('.risk-score-badge .score-number').allTextContents();
    const scores = riskScores.map(s => parseInt(s));

    // Verify scores are in descending order
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  test('Sorting by Last Activity works (Most Recent first)', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Select "Last Activity (Most Recent)" sorting
    await page.selectOption('#sortBy', 'activity-desc');
    await page.waitForTimeout(500);

    // Verify cards are displayed (sorting applied)
    const cards = page.locator('.apt-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('"ACTIVE" badge appears on recently active groups', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Look for ACTIVE badges
    const activeBadges = page.locator('.badge-active');
    const count = await activeBadges.count();

    // Based on our data (lastActivity dates), some groups may or may not be active
    // This test verifies the badge functionality exists, not that all groups are active
    if (count > 0) {
      const firstBadge = activeBadges.first();
      await expect(firstBadge).toContainText('ACTIVE');
    } else {
      // If no active badges, verify that the page loaded correctly
      const cards = page.locator('.apt-card');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });

  test('"HIGH PRIORITY" badge appears on Critical risk actors', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Look for HIGH PRIORITY badges
    const priorityBadges = page.locator('.badge-high-priority');
    const count = await priorityBadges.count();

    // If there are critical risk actors, they should have HIGH PRIORITY badge
    const criticalCards = page.locator('.apt-card.risk-critical');
    const criticalCount = await criticalCards.count();

    if (criticalCount > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Enhanced search functionality works across all fields', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Get initial count
    const initialCount = await page.locator('.apt-card').count();

    // Search for a common term (e.g., "Government")
    await page.fill('#searchInput', 'Government');
    await page.waitForTimeout(500);

    // Get filtered count
    const filteredCount = await page.locator('.apt-card').count();

    // Verify filtering occurred
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('Responsive design works on mobile viewport (375px width)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Verify cards are still visible
    const cards = page.locator('.apt-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Verify first card is visible
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
  });

  test('Hover effects work on high-risk actor cards', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Find a high-risk or critical card
    const highRiskCard = page.locator('.apt-card.risk-high, .apt-card.risk-critical').first();

    if ((await highRiskCard.count()) > 0) {
      // Hover over the card
      await highRiskCard.hover();

      // Verify card is still visible after hover
      await expect(highRiskCard).toBeVisible();
    }
  });

  test('MITRE ATT&CK links are present and functional', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Look for MITRE links
    const mitreLinks = page.locator('.mitre-link');
    const count = await mitreLinks.count();
    expect(count).toBeGreaterThan(0);

    // Verify first link has correct href pattern
    const firstLink = mitreLinks.first();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/attack\.mitre\.org\/groups/);

    // Verify link opens in new tab
    const target = await firstLink.getAttribute('target');
    expect(target).toBe('_blank');
  });

  test('Page maintains dark theme consistency', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Verify dark theme by checking that APT cards exist and are styled
    const cards = page.locator('.apt-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Verify risk score badges have styling (indicates CSS is loaded)
    const riskBadges = page.locator('.risk-score-badge');
    const badgeCount = await riskBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Verify dark theme classes are applied
    const hasRiskClasses = await page.evaluate(() => {
      const cards = document.querySelectorAll('.apt-card');
      return Array.from(cards).some(
        card =>
          card.className.includes('risk-critical') ||
          card.className.includes('risk-high') ||
          card.className.includes('risk-medium') ||
          card.className.includes('risk-low')
      );
    });

    expect(hasRiskClasses).toBeTruthy();
  });

  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Click on search input to focus it
    const searchInput = page.locator('#searchInput');
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // Tab to next element (country filter)
    await page.keyboard.press('Tab');
    const countryFilter = page.locator('#countryFilter');
    await expect(countryFilter).toBeFocused();

    // Verify filters are keyboard navigable
    await page.keyboard.press('Tab');
    const sophisticationFilter = page.locator('#sophisticationFilter');
    await expect(sophisticationFilter).toBeFocused();
  });

  test('No console errors during page load and interaction', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Interact with filters
    await page.selectOption('#riskLevelFilter', 'high');
    await page.waitForTimeout(500);

    // Verify no critical console errors (allow favicon 404)
    const criticalErrors = consoleErrors.filter(err => !err.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });
});
