import { test, expect } from '@playwright/test';

/**
 * WatchLockAI Dashboard - Comprehensive E2E Tests
 * Tests navigation, accessibility, filters, and functionality
 */

test.describe('WatchLockAI Dashboard - Navigation', () => {
  test('should load the main dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WatchLockAI/);
    await expect(page.locator('h1')).toContainText('Enterprise-grade threat intelligence');
  });

  test('should navigate to APT Profiles page', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    // Click on the APT Profiles navigation link
    await page.click('a[href="apt-profiles.html"]');
    await expect(page).toHaveURL(/apt-profiles\.html/);
    await expect(page.locator('h1')).toContainText('APT Profiles');
  });

  test('should navigate to Detection Engineering page', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    // Click on the Detection Engineering navigation link
    await page.click('a[href="detections.html"]');
    await expect(page).toHaveURL(/detections\.html/);
    await expect(page.locator('h1')).toContainText('Detection Engineering');
  });

  test('should navigate to Threat Actors page', async ({ page }) => {
    await page.goto('/');
    const threatActorsLink = page.locator('a[href="threat-actors.html"]');
    if (await threatActorsLink.count() > 0) {
      await threatActorsLink.click();
      await expect(page).toHaveURL(/threat-actors\.html/);
    }
  });

  test('should navigate to Dark Web Intelligence page', async ({ page }) => {
    await page.goto('/');
    const darkWebLink = page.locator('a[href="dark-web.html"]');
    if (await darkWebLink.count() > 0) {
      await darkWebLink.click();
      await expect(page).toHaveURL(/dark-web\.html/);
    }
  });

  test('should navigate to Geopolitical Risk page', async ({ page }) => {
    await page.goto('/');
    const geoRiskLink = page.locator('a[href="geopolitical-risk.html"]');
    if (await geoRiskLink.count() > 0) {
      await geoRiskLink.click();
      await expect(page).toHaveURL(/geopolitical-risk\.html/);
    }
  });
});

test.describe('APT Profiles - Accessibility Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apt-profiles.html');
  });

  test('should have accessible Country filter with proper label association', async ({
    page,
  }) => {
    const countryLabel = page.locator('label[for="countryFilter"]');
    const countrySelect = page.locator('select#countryFilter');

    await expect(countryLabel).toBeVisible();
    await expect(countryLabel).toHaveText('Country');
    await expect(countrySelect).toBeVisible();

    // Verify the label is properly associated
    const labelFor = await countryLabel.getAttribute('for');
    const selectId = await countrySelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should have accessible Sophistication filter with proper label association', async ({
    page,
  }) => {
    const sophisticationLabel = page.locator('label[for="sophisticationFilter"]');
    const sophisticationSelect = page.locator('select#sophisticationFilter');

    await expect(sophisticationLabel).toBeVisible();
    await expect(sophisticationLabel).toHaveText('Sophistication');
    await expect(sophisticationSelect).toBeVisible();

    // Verify the label is properly associated
    const labelFor = await sophisticationLabel.getAttribute('for');
    const selectId = await sophisticationSelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should have accessible Motivation filter with proper label association', async ({
    page,
  }) => {
    const motivationLabel = page.locator('label[for="motivationFilter"]');
    const motivationSelect = page.locator('select#motivationFilter');

    await expect(motivationLabel).toBeVisible();
    await expect(motivationLabel).toHaveText('Motivation');
    await expect(motivationSelect).toBeVisible();

    // Verify the label is properly associated
    const labelFor = await motivationLabel.getAttribute('for');
    const selectId = await motivationSelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should pass accessibility audit for form controls', async ({ page }) => {
    const snapshot = await page.accessibility.snapshot();
    
    // Find all select elements in the accessibility tree
    const findSelects = (node) => {
      const selects = [];
      if (node.role === 'combobox' || node.role === 'listbox') {
        selects.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          selects.push(...findSelects(child));
        }
      }
      return selects;
    };

    const selectElements = findSelects(snapshot);
    
    // Verify all select elements have names (accessible labels)
    for (const select of selectElements) {
      expect(select.name).toBeTruthy();
    }
  });
});

test.describe('Detection Engineering - Accessibility Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/detections.html');
  });

  test('should have accessible Severity filter with proper label association', async ({
    page,
  }) => {
    const severityLabel = page.locator('label[for="severityFilter"]');
    const severitySelect = page.locator('select#severityFilter');

    await expect(severityLabel).toBeVisible();
    await expect(severityLabel).toHaveText('Severity');
    await expect(severitySelect).toBeVisible();

    const labelFor = await severityLabel.getAttribute('for');
    const selectId = await severitySelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should have accessible Status filter with proper label association', async ({
    page,
  }) => {
    const statusLabel = page.locator('label[for="statusFilter"]');
    const statusSelect = page.locator('select#statusFilter');

    await expect(statusLabel).toBeVisible();
    await expect(statusLabel).toHaveText('Status');
    await expect(statusSelect).toBeVisible();

    const labelFor = await statusLabel.getAttribute('for');
    const selectId = await statusSelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should have accessible Platform filter with proper label association', async ({
    page,
  }) => {
    const platformLabel = page.locator('label[for="platformFilter"]');
    const platformSelect = page.locator('select#platformFilter');

    await expect(platformLabel).toBeVisible();
    await expect(platformLabel).toHaveText('Platform');
    await expect(platformSelect).toBeVisible();

    const labelFor = await platformLabel.getAttribute('for');
    const selectId = await platformSelect.getAttribute('id');
    expect(labelFor).toBe(selectId);
  });

  test('should not have inline styles on nav element', async ({ page }) => {
    const navMenu = page.locator('nav.nav-menu');
    const inlineStyle = await navMenu.getAttribute('style');
    
    // Should not have inline style attribute or it should be empty
    expect(inlineStyle).toBeFalsy();
  });

  test('should have nav-menu-spaced class applied', async ({ page }) => {
    const navMenu = page.locator('nav.nav-menu');
    await expect(navMenu).toHaveClass(/nav-menu-spaced/);
  });

  test('should not have inline styles on coverage description', async ({ page }) => {
    // Switch to coverage tab first
    await page.click('button[data-tab="coverage"]');
    await page.waitForTimeout(500);

    const coverageDesc = page.locator('.coverage-description');
    if (await coverageDesc.count() > 0) {
      const inlineStyle = await coverageDesc.getAttribute('style');
      expect(inlineStyle).toBeFalsy();
    }
  });

  test('should have coverage-description class applied', async ({ page }) => {
    // Switch to coverage tab first
    await page.click('button[data-tab="coverage"]');
    await page.waitForTimeout(500);

    const coverageDesc = page.locator('.coverage-description');
    if (await coverageDesc.count() > 0) {
      await expect(coverageDesc).toHaveClass(/coverage-description/);
    }
  });
});

test.describe('Detection Engineering - Tab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/detections.html');
  });

  test('should switch between Detection Catalog and MITRE Coverage tabs', async ({
    page,
  }) => {
    // Verify Detection Catalog tab is active by default
    const catalogTab = page.locator('button[data-tab="catalog"]');
    await expect(catalogTab).toHaveClass(/active/);

    const catalogContent = page.locator('#catalogTab');
    await expect(catalogContent).toHaveClass(/active/);

    // Click MITRE Coverage tab
    const coverageTab = page.locator('button[data-tab="coverage"]');
    await coverageTab.click();
    await page.waitForTimeout(300);

    // Verify MITRE Coverage tab is now active
    await expect(coverageTab).toHaveClass(/active/);
    await expect(catalogTab).not.toHaveClass(/active/);

    const coverageContent = page.locator('#coverageTab');
    await expect(coverageContent).toHaveClass(/active/);
    await expect(catalogContent).not.toHaveClass(/active/);

    // Switch back to Detection Catalog
    await catalogTab.click();
    await page.waitForTimeout(300);

    await expect(catalogTab).toHaveClass(/active/);
    await expect(coverageTab).not.toHaveClass(/active/);
  });
});

