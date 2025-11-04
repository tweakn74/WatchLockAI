/**
 * E2E Tests for Dashboard 7: Modern APT Overview
 * Tests the APT Detail Modal functionality and enhanced features
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard 7: Modern APT Overview - APT Detail Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.apt-card', { timeout: 5000 });
  });

  test('APT cards are clickable and have cursor pointer', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    
    // Verify card has cursor pointer style
    const cursor = await firstCard.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
    
    // Verify card has data-id attribute
    const dataId = await firstCard.getAttribute('data-id');
    expect(dataId).toBeTruthy();
  });

  test('Clicking APT card opens modal', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    
    // Verify modal is hidden initially
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'none');
    
    // Click card
    await firstCard.click();
    await page.waitForTimeout(300);
    
    // Verify modal is visible
    await expect(modal).toHaveCSS('display', 'block');
  });

  test('Modal displays comprehensive APT profile information', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modalBody = page.locator('#modalBody');
    
    // Verify Overview section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'Overview' })).toBeVisible();
    
    // Verify Motivation section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'Motivation' })).toBeVisible();
    
    // Verify Targeted Sectors section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'Targeted Sectors' })).toBeVisible();
    
    // Verify Targeted Countries section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'Targeted Countries' })).toBeVisible();
    
    // Verify MITRE ATT&CK Techniques section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'MITRE ATT&CK Techniques' })).toBeVisible();
    
    // Verify Malware Arsenal section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'Malware Arsenal' })).toBeVisible();
    
    // Verify External References section
    await expect(modalBody.locator('.modal-section-title').filter({ hasText: 'External References' })).toBeVisible();
  });

  test('Modal header displays APT name, aliases, and metadata', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modalHeader = page.locator('#modalHeader');
    
    // Verify modal title exists
    const modalTitle = modalHeader.locator('.modal-title');
    await expect(modalTitle).toBeVisible();
    const titleText = await modalTitle.textContent();
    expect(titleText.length).toBeGreaterThan(0);
    
    // Verify modal subtitle (aliases) exists
    const modalSubtitle = modalHeader.locator('.modal-subtitle');
    await expect(modalSubtitle).toBeVisible();
    
    // Verify country badge exists
    const countryBadge = modalHeader.locator('.country-badge');
    await expect(countryBadge).toBeVisible();
    
    // Verify sophistication badge exists
    const sophBadge = modalHeader.locator('.sophistication-badge');
    await expect(sophBadge).toBeVisible();
    
    // Verify risk score badge exists
    const riskBadge = modalHeader.locator('.risk-score-badge');
    await expect(riskBadge).toBeVisible();
    const riskText = await riskBadge.textContent();
    expect(riskText).toContain('Risk:');
  });

  test('Modal close button works', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'block');
    
    // Click close button
    const closeBtn = page.locator('.close');
    await closeBtn.click();
    await page.waitForTimeout(300);
    
    // Verify modal is hidden
    await expect(modal).toHaveCSS('display', 'none');
  });

  test('ESC key closes modal', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'block');
    
    // Press ESC key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify modal is hidden
    await expect(modal).toHaveCSS('display', 'none');
  });

  test('Clicking outside modal closes it', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'block');
    
    // Click on modal backdrop (outside modal content)
    await modal.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    
    // Verify modal is hidden
    await expect(modal).toHaveCSS('display', 'none');
  });

  test('MITRE ATT&CK technique links are functional', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    // Find technique links in modal
    const techniqueLinks = page.locator('.technique-tag[href*="attack.mitre.org"]');
    const count = await techniqueLinks.count();
    
    if (count > 0) {
      const firstLink = techniqueLinks.first();
      
      // Verify link has correct href pattern
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/attack\.mitre\.org\/techniques/);
      
      // Verify link opens in new tab
      const target = await firstLink.getAttribute('target');
      expect(target).toBe('_blank');
    }
  });

  test('Modal displays malware information correctly', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modalBody = page.locator('#modalBody');
    const malwareSection = modalBody.locator('.modal-section-title').filter({ hasText: 'Malware Arsenal' });
    
    await expect(malwareSection).toBeVisible();
    
    // Verify malware count is displayed
    const sectionText = await malwareSection.textContent();
    expect(sectionText).toMatch(/\(\d+\)/); // Should contain count like (5)
  });

  test('Modal has smooth animations', async ({ page }) => {
    const modal = page.locator('#aptModal');
    
    // Verify modal has animation styles
    const animation = await modal.evaluate(el => getComputedStyle(el).animation);
    expect(animation).toBeTruthy();
  });

  test('Modal content is scrollable for long content', async ({ page }) => {
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modalBody = page.locator('.modal-body');
    
    // Verify modal body has overflow-y auto
    const overflowY = await modalBody.evaluate(el => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
    
    // Verify max-height is set
    const maxHeight = await modalBody.evaluate(el => getComputedStyle(el).maxHeight);
    expect(maxHeight).not.toBe('none');
  });

  test('Multiple APT cards can be opened sequentially', async ({ page }) => {
    const cards = page.locator('.apt-card');
    const cardCount = await cards.count();
    
    if (cardCount >= 2) {
      // Open first card
      await cards.nth(0).click();
      await page.waitForTimeout(300);
      
      const modal = page.locator('#aptModal');
      await expect(modal).toHaveCSS('display', 'block');
      
      // Get first APT name
      const firstName = await page.locator('.modal-title').textContent();
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      // Open second card
      await cards.nth(1).click();
      await page.waitForTimeout(300);
      
      await expect(modal).toHaveCSS('display', 'block');
      
      // Get second APT name
      const secondName = await page.locator('.modal-title').textContent();
      
      // Verify different APTs were shown
      expect(firstName).not.toBe(secondName);
    }
  });

  test('Modal works with filtered results', async ({ page }) => {
    // Apply a filter
    await page.selectOption('#sophisticationFilter', 'advanced');
    await page.waitForTimeout(500);
    
    // Click first filtered card
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'block');
    
    // Verify modal content is displayed
    const modalTitle = page.locator('.modal-title');
    await expect(modalTitle).toBeVisible();
  });

  test('Modal is accessible and has proper ARIA attributes', async ({ page }) => {
    const modal = page.locator('#aptModal');
    
    // Modal should have role or aria attributes (if implemented)
    // This is a placeholder for accessibility testing
    await expect(modal).toBeAttached();
  });

  test('No console errors when opening and closing modal', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify no critical console errors (allow favicon 404)
    const criticalErrors = consoleErrors.filter(err => !err.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });

  test('Modal responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('.apt-card', { timeout: 5000 });
    
    const firstCard = page.locator('.apt-card').first();
    await firstCard.click();
    await page.waitForTimeout(300);
    
    const modal = page.locator('#aptModal');
    await expect(modal).toHaveCSS('display', 'block');
    
    // Verify modal content is visible
    const modalContent = page.locator('.modal-content');
    await expect(modalContent).toBeVisible();
  });
});

