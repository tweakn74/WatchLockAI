/**
 * E2E Tests for Dashboard 5: Dark Theme Enhancements
 * 
 * Tests verify that all dashboard pages use the Versedetect color scheme consistently.
 * 
 * Versedetect Color Scheme:
 * - Background: #0f1114 (--bg)
 * - Panel: #151821 (--panel)
 * - Text Primary: #e8ecf1 (--text-primary)
 * - Text Muted: #a7b0bf (--text-muted)
 * - Brand: #5aa9ff (--brand)
 * - Danger: #ff6b7a (--danger)
 * - Warn: #ffb86b (--warn)
 * - Brand Alt: #7ee787 (--brand-alt)
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard 5: Dark Theme Enhancements', () => {
  
  test('Breach & Attack Simulation page uses Versedetect color scheme', async ({ page }) => {
    await page.goto('http://localhost:8080/breach-attack-simulation.html');
    await page.waitForSelector('.threat-profile', { timeout: 5000 });

    // Check background color
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(15, 17, 20)'); // #0f1114

    // Check panel background
    const threatProfile = page.locator('.threat-profile').first();
    await expect(threatProfile).toHaveCSS('background', /rgb\(21, 24, 33\)/); // #151821

    // Check text color
    const heading = page.locator('h1');
    await expect(heading).toHaveCSS('color', /rgb\(232, 236, 241\)/); // #e8ecf1
  });
  
  test('APT Profiles page uses Versedetect color scheme', async ({ page }) => {
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });
    
    // Check background color
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(15, 17, 20)'); // #0f1114
    
    // Check APT card background
    const aptCard = page.locator('.apt-card').first();
    await expect(aptCard).toHaveCSS('background', /rgb\(21, 24, 33\)/); // #151821
    
    // Check critical risk badge color (--danger)
    const criticalBadge = page.locator('.risk-critical .risk-score-badge').first();
    if (await criticalBadge.count() > 0) {
      await expect(criticalBadge).toHaveCSS('background', /rgb\(255, 107, 122\)/); // #ff6b7a
    }
  });
  
  test('Detection Engineering page uses Versedetect color scheme', async ({ page }) => {
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('.detection-card', { timeout: 5000 });
    
    // Check background color
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(15, 17, 20)'); // #0f1114
    
    // Check detection card background
    const detectionCard = page.locator('.detection-card').first();
    await expect(detectionCard).toHaveCSS('background', /rgb\(21, 24, 33\)/); // #151821
    
    // Check critical severity badge color (--danger)
    const criticalBadge = page.locator('.severity-critical').first();
    if (await criticalBadge.count() > 0) {
      await expect(criticalBadge).toHaveCSS('background', /rgb\(255, 107, 122\)/); // #ff6b7a or gradient
    }
  });
  
  test('Severity badges use correct Versedetect colors', async ({ page }) => {
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('.detection-card', { timeout: 5000 });
    
    // Critical: --danger (#ff6b7a)
    const criticalBadge = page.locator('.severity-critical').first();
    if (await criticalBadge.count() > 0) {
      await expect(criticalBadge).toHaveCSS('background-color', /rgb\(255, 107, 122\)/);
    }
    
    // High: --brand (#5aa9ff)
    const highBadge = page.locator('.severity-high').first();
    if (await highBadge.count() > 0) {
      await expect(highBadge).toHaveCSS('background-color', /rgb\(90, 169, 255\)/);
    }
    
    // Medium: --warn (#ffb86b)
    const mediumBadge = page.locator('.severity-medium').first();
    if (await mediumBadge.count() > 0) {
      await expect(mediumBadge).toHaveCSS('background-color', /rgb\(255, 184, 107\)/);
    }
    
    // Low: --brand-alt (#7ee787)
    const lowBadge = page.locator('.severity-low').first();
    if (await lowBadge.count() > 0) {
      await expect(lowBadge).toHaveCSS('background-color', /rgb\(126, 231, 135\)/);
    }
  });
  
  test('Risk score badges use correct Versedetect colors', async ({ page }) => {
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });
    
    // Critical: --danger (#ff6b7a)
    const criticalBadge = page.locator('.risk-critical .risk-score-badge').first();
    if (await criticalBadge.count() > 0) {
      await expect(criticalBadge).toHaveCSS('background', /rgb\(255, 107, 122\)/);
    }
    
    // High: --brand (#5aa9ff)
    const highBadge = page.locator('.risk-high .risk-score-badge').first();
    if (await highBadge.count() > 0) {
      await expect(highBadge).toHaveCSS('background', /rgb\(90, 169, 255\)/);
    }
    
    // Medium: --warn (#ffb86b)
    const mediumBadge = page.locator('.risk-medium .risk-score-badge').first();
    if (await mediumBadge.count() > 0) {
      await expect(mediumBadge).toHaveCSS('background', /rgb\(255, 184, 107\)/);
    }
    
    // Low: --brand-alt (#7ee787)
    const lowBadge = page.locator('.risk-low .risk-score-badge').first();
    if (await lowBadge.count() > 0) {
      await expect(lowBadge).toHaveCSS('background', /rgb\(126, 231, 135\)/);
    }
  });
  
  test('Border radius values are consistent across pages', async ({ page }) => {
    // Check APT Profiles page
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });
    
    const aptCard = page.locator('.apt-card').first();
    const aptBorderRadius = await aptCard.evaluate(el => getComputedStyle(el).borderRadius);
    expect(aptBorderRadius).toMatch(/12px|16px|22px/);
    
    // Check Detection Engineering page
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('.detection-card', { timeout: 5000 });
    
    const detectionCard = page.locator('.detection-card').first();
    const detectionBorderRadius = await detectionCard.evaluate(el => getComputedStyle(el).borderRadius);
    expect(detectionBorderRadius).toMatch(/12px|16px|22px/);
  });
  
  test('Shadow values are consistent across pages', async ({ page }) => {
    // Check APT Profiles page
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });
    
    const aptCard = page.locator('.apt-card').first();
    const aptBoxShadow = await aptCard.evaluate(el => getComputedStyle(el).boxShadow);
    expect(aptBoxShadow).toBeTruthy();
    expect(aptBoxShadow).not.toBe('none');
    
    // Check Detection Engineering page
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('.detection-card', { timeout: 5000 });
    
    const detectionCard = page.locator('.detection-card').first();
    const detectionBoxShadow = await detectionCard.evaluate(el => getComputedStyle(el).boxShadow);
    expect(detectionBoxShadow).toBeTruthy();
    expect(detectionBoxShadow).not.toBe('none');
  });
  
  test('Text colors are consistent across pages', async ({ page }) => {
    // Check Executive Metrics Landing Page
    await page.goto('http://localhost:8080/');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const heading = page.locator('h1');
    await expect(heading).toHaveCSS('color', /rgb\(232, 236, 241\)/); // --text-primary
    
    // Check APT Profiles page
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const aptHeading = page.locator('h1');
    await expect(aptHeading).toHaveCSS('color', /rgb\(232, 236, 241\)/);
    
    // Check Detection Engineering page
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const detectionHeading = page.locator('h1');
    await expect(detectionHeading).toHaveCSS('color', /rgb\(232, 236, 241\)/);
  });
  
  test('Hover effects work with new color scheme', async ({ page }) => {
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    const aptCard = page.locator('.apt-card').first();

    // Hover over the card
    await aptCard.hover();

    // Check that transform is applied (scale or translateY)
    const transform = await aptCard.evaluate(el => getComputedStyle(el).transform);
    expect(transform).not.toBe('none');
  });
  
  test('No console errors on any page', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check APT Profiles page
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForSelector('.apt-card', { timeout: 5000 });

    // Check Detection Engineering page
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForSelector('.detection-card', { timeout: 5000 });

    // Filter out 404 errors for favicon and CSS files (expected)
    const relevantErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('/src/style.css') &&
      !err.includes('Failed to load resource')
    );

    // Log errors for debugging
    if (relevantErrors.length > 0) {
      console.log('Console errors found:', relevantErrors);
    }

    expect(relevantErrors.length).toBe(0);
  });
  
});

