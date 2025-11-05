import { test, expect } from '@playwright/test';

test.describe('WatchLockAI Data Loading Verification', () => {
  test('APT Profiles page loads data correctly', async ({ page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to APT Profiles page
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify APT profile cards are visible
    const aptCards = page.locator('.apt-card');
    const cardCount = await aptCards.count();

    console.log(`✅ APT Profiles: Found ${cardCount} APT actor cards`);
    expect(cardCount).toBe(8);

    // Verify at least one APT card has content
    const firstCardName = await page.locator('.apt-name').first().textContent();
    console.log(`✅ First APT actor: ${firstCardName}`);
    expect(firstCardName).toBeTruthy();
    expect(firstCardName.length).toBeGreaterThan(0);

    // Verify country badges are visible
    const countryBadges = page.locator('.country-badge');
    const countryCount = await countryBadges.count();
    console.log(`✅ Country badges visible: ${countryCount}`);
    expect(countryCount).toBeGreaterThan(0);

    // Check for console errors (ignore 404s for non-critical resources like favicon)
    const criticalErrors = consoleErrors.filter(err => !err.includes('404'));
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console messages on APT Profiles page:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No console errors on APT Profiles page');
    }

    // Only fail on critical errors (not 404s)
    expect(criticalErrors.length).toBe(0);
  });

  test('Detection Engineering page loads data correctly', async ({ page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to Detection Engineering page
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify detection cards are visible
    const detectionCards = page.locator('.detection-card');
    const cardCount = await detectionCards.count();

    console.log(`✅ Detections: Found ${cardCount} detection cards`);
    expect(cardCount).toBeGreaterThanOrEqual(15);

    // Verify statistics are populated with expected values
    const totalDetections = await page.locator('#totalDetections').textContent();
    const criticalCount = await page.locator('#criticalCount').textContent();
    const highCount = await page.locator('#highCount').textContent();
    const techniquesCovered = await page.locator('#techniquesCovered').textContent();

    console.log('✅ Statistics:');
    console.log(`   - Total Detections: ${totalDetections}`);
    console.log(`   - Critical: ${criticalCount}`);
    console.log(`   - High: ${highCount}`);
    console.log(`   - Techniques Covered: ${techniquesCovered}`);

    // Verify statistics are not blank or "-"
    expect(totalDetections).not.toBe('-');
    expect(criticalCount).not.toBe('-');
    expect(highCount).not.toBe('-');
    expect(techniquesCovered).not.toBe('-');

    // Verify expected values (based on actual data: 5 CRITICAL, 9 HIGH, 1 MEDIUM)
    expect(parseInt(totalDetections)).toBe(15);
    expect(parseInt(criticalCount)).toBe(5);
    expect(parseInt(highCount)).toBe(9);
    expect(parseInt(techniquesCovered)).toBeGreaterThanOrEqual(20);

    // Verify at least one detection card has content
    const firstDetectionName = await page.locator('.detection-name').first().textContent();
    console.log(`✅ First detection: ${firstDetectionName}`);
    expect(firstDetectionName).toBeTruthy();
    expect(firstDetectionName.length).toBeGreaterThan(0);

    // Check for console errors (ignore 404s for non-critical resources like favicon)
    const criticalErrors = consoleErrors.filter(err => !err.includes('404'));
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console messages on Detection Engineering page:');
      consoleErrors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log('✅ No console errors on Detection Engineering page');
    }

    // Only fail on critical errors (not 404s)
    expect(criticalErrors.length).toBe(0);
  });

  test('Filters and search functionality work', async ({ page }) => {
    // Test APT Profiles filters
    await page.goto('http://localhost:8080/apt-profiles.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Test sophistication filter
    const sophisticationFilter = page.locator('select#sophisticationFilter');
    await sophisticationFilter.selectOption('advanced');
    await page.waitForTimeout(500);

    const filteredCards = await page.locator('.apt-card').count();
    console.log(
      `✅ APT Profiles: Sophistication filter working (${filteredCards} cards after filtering)`
    );
    expect(filteredCards).toBeGreaterThan(0);

    // Reset filter
    await sophisticationFilter.selectOption('');
    await page.waitForTimeout(500);

    // Test Detection Engineering filters
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Test severity filter
    const severityFilter = page.locator('select#severityFilter');
    await severityFilter.selectOption('CRITICAL');
    await page.waitForTimeout(500);

    const filteredDetections = await page.locator('.detection-card').count();
    console.log(
      `✅ Detections: Severity filter working (${filteredDetections} critical detections)`
    );
    expect(filteredDetections).toBe(5);

    // Test tab switching
    const coverageTab = page.locator('button:has-text("MITRE Coverage")');
    await coverageTab.click();
    await page.waitForTimeout(500);

    const coverageMatrix = page.locator('#coverageMatrix');
    await expect(coverageMatrix).toBeVisible();
    console.log('✅ Detections: Tab switching to MITRE Coverage works');
  });
});
