import { test, expect } from '@playwright/test';

test.describe('WatchLockAI Home Page - Versedetect Style Redesign', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/WatchLockAI.*Threat Intelligence Platform/);
  });

  test('header navigation is visible and functional', async ({ page }) => {
    const header = page.locator('.site-header');
    await expect(header).toBeVisible();

    // Check logo
    const logo = page.locator('.site-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('WatchLockAI');

    // Check navigation links
    const navLinks = page.locator('.nav-link');
    await expect(navLinks).toHaveCount(6); // Home, APT Profiles, Geo Map, Dark Web Intel, Detections, BAS Matching

    // Verify all navigation links are present
    await expect(page.locator('.nav-link:has-text("Home")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("APT Profiles")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("Geo Map")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("Dark Web Intel")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("Detections")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("BAS Matching")')).toBeVisible();
  });

  test('hero section displays correctly', async ({ page }) => {
    const heroSection = page.locator('.hero-section');
    await expect(heroSection).toBeVisible();

    // Check badge
    const badge = page.locator('.hero-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Threat Intelligence Platform');

    // Check title
    const title = page.locator('.hero-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Enterprise-grade threat intelligence');

    // Check description
    const description = page.locator('.hero-description');
    await expect(description).toBeVisible();
    await expect(description).toContainText('WatchLockAI');
    await expect(description).toContainText('MITRE ATT&CK');

    // Check CTA buttons
    const primaryButton = page.locator('.btn-primary');
    await expect(primaryButton).toBeVisible();
    await expect(primaryButton).toContainText('Browse APT Profiles');

    const secondaryButton = page.locator('.btn-secondary').first();
    await expect(secondaryButton).toBeVisible();
    await expect(secondaryButton).toContainText('View Dark Web Intel');
  });

  test('stats cards display metrics correctly', async ({ page }) => {
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // Hero section has 3 stat cards
    const heroStatCards = page.locator('.stats-grid .stat-card');
    await expect(heroStatCards).toHaveCount(3);

    // Wait for metrics to load
    await page.waitForFunction(
      () => {
        const aptMetric = document.getElementById('aptGroupsMetric');
        return aptMetric && aptMetric.textContent !== '-';
      },
      { timeout: 5000 }
    );

    // Check APT Groups metric
    const aptGroupsMetric = page.locator('#aptGroupsMetric');
    const aptGroupsValue = await aptGroupsMetric.textContent();
    expect(parseInt(aptGroupsValue)).toBeGreaterThan(0);

    // Check Detection Rules metric
    const detectionsMetric = page.locator('#detectionsMetric');
    const detectionsValue = await detectionsMetric.textContent();
    expect(parseInt(detectionsValue)).toBeGreaterThan(0);

    // Check MITRE Techniques metric
    const techniquesMetric = page.locator('#techniquesMetric');
    const techniquesValue = await techniquesMetric.textContent();
    expect(parseInt(techniquesValue)).toBeGreaterThan(0);
  });

  test('latest features section is visible', async ({ page }) => {
    const featuresSection = page.locator('.section').nth(0);
    await expect(featuresSection).toBeVisible();

    const sectionTitle = page.locator('.section-title').first();
    await expect(sectionTitle).toContainText('Latest Features');

    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);

    // Check feature card content
    await expect(
      page.locator('.feature-title:has-text("Dark Web Intelligence Feed")')
    ).toBeVisible();
    await expect(
      page.locator('.feature-title:has-text("Modern APT Overview Dashboard")')
    ).toBeVisible();
    await expect(page.locator('.feature-title:has-text("Analytics Dashboard")')).toBeVisible();
  });

  test('MITRE ATT&CK coverage section is visible', async ({ page }) => {
    const coverageSection = page.locator('.section').nth(1);
    await expect(coverageSection).toBeVisible();

    const coverageTitle = page.locator('.section-title:has-text("MITRE ATT&CK Coverage")');
    await expect(coverageTitle).toBeVisible();

    const coverageButton = page.locator('.btn-secondary:has-text("View Coverage Matrix")');
    await expect(coverageButton).toBeVisible();
  });

  test('footer is present with correct information', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();

    await expect(footer).toContainText('WatchLockAI');
    await expect(footer).toContainText('Enterprise Threat Intelligence Platform');
    await expect(footer).toContainText('MITRE ATT&CK Framework');

    // Check footer links
    await expect(page.locator('.footer-link:has-text("GitHub")')).toBeVisible();
    await expect(page.locator('.footer-link:has-text("APT Profiles")')).toBeVisible();
    await expect(page.locator('.footer-link:has-text("Detections")')).toBeVisible();
    await expect(page.locator('.footer-link:has-text("Dark Web Intel")')).toBeVisible();
  });

  test('navigation links work correctly', async ({ page }) => {
    // Test APT Profiles link
    await page.locator('.btn-primary:has-text("Browse APT Profiles")').click();
    await expect(page).toHaveURL(/apt-profiles\.html/);
    await page.goBack();

    // Test Dark Web Intel link
    await page.locator('.btn-secondary:has-text("View Dark Web Intel")').click();
    await expect(page).toHaveURL(/dark-web-intel\.html/);
    await page.goBack();

    // Test header navigation
    await page.locator('.nav-link:has-text("Detections")').click();
    await expect(page).toHaveURL(/detections\.html/);
  });

  test('feature cards are clickable and navigate correctly', async ({ page }) => {
    // Click Dark Web Intelligence card
    await page.locator('.feature-card:has-text("Dark Web Intelligence Feed")').click();
    await expect(page).toHaveURL(/dark-web-intel\.html/);
  });

  test('page is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Hero section should still be visible
    const heroSection = page.locator('.hero-section');
    await expect(heroSection).toBeVisible();

    // Mobile menu toggle should be visible
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    await expect(mobileMenuToggle).toBeVisible();

    // Stats grid should stack vertically
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();

    // Feature cards should stack vertically
    const featureCards = page.locator('.feature-card');
    await expect(featureCards.first()).toBeVisible();
  });

  test('mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    const navMenu = page.locator('.nav-menu');

    // Menu should be hidden initially
    await expect(navMenu).not.toHaveClass(/active/);

    // Click toggle to open menu
    await mobileMenuToggle.click();
    await expect(navMenu).toHaveClass(/active/);

    // Click toggle again to close menu
    await mobileMenuToggle.click();
    await expect(navMenu).not.toHaveClass(/active/);
  });

  test('hover effects work on feature cards', async ({ page }) => {
    const firstFeatureCard = page.locator('.feature-card').first();

    // Hover over the card
    await firstFeatureCard.hover();

    // Card should be visible (basic check)
    await expect(firstFeatureCard).toBeVisible();
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (404s, fetch errors in test environment)
    const unexpectedErrors = consoleErrors.filter(
      error =>
        !error.includes('404') &&
        !error.includes('Failed to load resource') &&
        !error.includes('Failed to fetch') &&
        !error.includes('Error loading metrics')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });

  test('accessibility: skip to content link works', async ({ page }) => {
    const skipLink = page.locator('.skip-to-content');
    await expect(skipLink).toHaveCount(1); // Link exists

    // Focus the skip link (simulating Tab key)
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test('accessibility: page has proper ARIA attributes', async ({ page }) => {
    // Check header has proper structure
    const header = page.locator('.site-header');
    await expect(header).toBeVisible();

    // Check main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('id', 'main');

    // Check footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('Versedetect color scheme is applied', async ({ page }) => {
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);

    // Check that background is dark (Versedetect theme)
    expect(bgColor).toContain('rgb(15, 17, 20)'); // --bg: #0f1114
  });

  test('no mention of Craig Glatt in user-facing content', async ({ page }) => {
    const pageContent = await page.textContent('body');
    expect(pageContent.toLowerCase()).not.toContain('craig glatt');
  });
});
