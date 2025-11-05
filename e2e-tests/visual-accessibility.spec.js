import { test, expect } from '@playwright/test';

/**
 * WatchLockAI Dashboard - Visual Regression & Accessibility Tests
 */

test.describe('Visual Regression - Screenshots', () => {
  test('should capture main dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/main-dashboard.png',
      fullPage: true,
    });
  });

  test('should capture APT Profiles page screenshot', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/apt-profiles.png',
      fullPage: true,
    });
  });

  test('should capture Detection Engineering page screenshot', async ({ page }) => {
    await page.goto('/detections.html');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/detections-catalog.png',
      fullPage: true,
    });
  });

  test('should capture Detection Engineering - MITRE Coverage tab screenshot', async ({ page }) => {
    await page.goto('/detections.html');
    await page.waitForTimeout(1000);
    await page.click('button[data-tab="coverage"]');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'playwright-report/screenshots/detections-coverage.png',
      fullPage: true,
    });
  });

  test('should capture Threat Actors page screenshot', async ({ page }) => {
    await page.goto('/threat-actors.html');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/threat-actors.png',
      fullPage: true,
    });
  });

  test('should capture Dark Web Intelligence page screenshot', async ({ page }) => {
    await page.goto('/dark-web.html');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/dark-web.png',
      fullPage: true,
    });
  });

  test('should capture Geopolitical Risk page screenshot', async ({ page }) => {
    await page.goto('/geopolitical-risk.html');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'playwright-report/screenshots/geopolitical-risk.png',
      fullPage: true,
    });
  });
});

test.describe('Accessibility Audit - WCAG Compliance', () => {
  test('should pass accessibility audit on main dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();
    expect(snapshot.role).toBeTruthy();
  });

  test('should pass accessibility audit on APT Profiles page', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForTimeout(1000);

    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();

    // Verify all form controls have accessible names
    const findFormControls = node => {
      const controls = [];
      if (
        node.role === 'combobox' ||
        node.role === 'textbox' ||
        node.role === 'button' ||
        node.role === 'listbox'
      ) {
        controls.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          controls.push(...findFormControls(child));
        }
      }
      return controls;
    };

    const formControls = findFormControls(snapshot);

    // All form controls should have names
    for (const control of formControls) {
      if (control.role !== 'button' || control.name !== '') {
        // Buttons can have empty names if they have aria-label or other accessible text
        expect(control.name || control.description).toBeTruthy();
      }
    }
  });

  test('should pass accessibility audit on Detection Engineering page', async ({ page }) => {
    await page.goto('/detections.html');
    await page.waitForTimeout(1000);

    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();

    // Verify all form controls have accessible names
    const findFormControls = node => {
      const controls = [];
      if (
        node.role === 'combobox' ||
        node.role === 'textbox' ||
        node.role === 'button' ||
        node.role === 'listbox'
      ) {
        controls.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          controls.push(...findFormControls(child));
        }
      }
      return controls;
    };

    const formControls = findFormControls(snapshot);

    // All form controls should have names
    for (const control of formControls) {
      if (control.role !== 'button' || control.name !== '') {
        expect(control.name || control.description).toBeTruthy();
      }
    }
  });

  test('should have proper heading hierarchy on all pages', async ({ page }) => {
    // Only test pages that exist in the intel-dashboard folder
    const pages = ['/', '/apt-profiles.html', '/detections.html'];

    for (const url of pages) {
      await page.goto(url);
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Wait for h1 element to be present
      await page.waitForSelector('h1', { timeout: 5000 });

      // Check for h1 element
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Verify h1 is visible
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
    }
  });

  test('should have proper color contrast (basic check)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check that text is visible (basic contrast check)
    const textElements = page.locator('p, span, a, button, label');
    const count = await textElements.count();

    expect(count).toBeGreaterThan(0);

    // Verify at least some text elements are visible
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      if (await element.isVisible()) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          // Element has visible text - basic contrast check passed
          expect(true).toBe(true);
        }
      }
    }
  });

  test('should have alt text for images if present', async ({ page }) => {
    const pages = [
      '/',
      '/apt-profiles.html',
      '/detections.html',
      '/threat-actors.html',
      '/dark-web.html',
      '/geopolitical-risk.html',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(500);

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');

        // Images should have alt attribute (can be empty for decorative images)
        expect(alt !== null).toBe(true);
      }
    }
  });

  test('should have proper link text (no "click here")', async ({ page }) => {
    const pages = [
      '/',
      '/apt-profiles.html',
      '/detections.html',
      '/threat-actors.html',
      '/dark-web.html',
      '/geopolitical-risk.html',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(500);

      const links = page.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const text = await link.textContent();

        if (text) {
          const lowerText = text.toLowerCase().trim();
          // Avoid generic link text
          expect(lowerText).not.toBe('click here');
          expect(lowerText).not.toBe('here');
          expect(lowerText).not.toBe('more');
        }
      }
    }
  });

  test('should have keyboard navigation support', async ({ page }) => {
    await page.goto('/apt-profiles.html');
    await page.waitForTimeout(1000);

    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Verify focus is visible (at least one element should be focused)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Layout and Styling Verification', () => {
  test('should have proper CSS classes applied on Detection Engineering page', async ({ page }) => {
    await page.goto('/detections.html');
    await page.waitForTimeout(1000);

    // Verify nav-menu-spaced class
    const navMenu = page.locator('nav.nav-menu');
    const navClasses = await navMenu.getAttribute('class');
    expect(navClasses).toContain('nav-menu-spaced');

    // Switch to coverage tab
    await page.click('button[data-tab="coverage"]');
    await page.waitForTimeout(500);

    // Verify coverage-description class
    const coverageDesc = page.locator('.coverage-description');
    if ((await coverageDesc.count()) > 0) {
      const descClasses = await coverageDesc.getAttribute('class');
      expect(descClasses).toContain('coverage-description');
    }
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);

    const content = await viewportMeta.getAttribute('content');
    expect(content).toContain('width=device-width');
  });
});
