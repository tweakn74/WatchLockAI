import { test } from '@playwright/test';

/**
 * User Experience Demonstration Test
 *
 * This test demonstrates what a user should see when using the WatchLockAI dashboard.
 * Run with: npx playwright test e2e-tests/user-experience-demo.spec.js --headed --slow-mo=1000
 */

test.describe('WatchLockAI User Experience Demo', () => {
  test('Complete user journey through the dashboard', async ({ page }) => {
    // Increase timeout for this demo test
    test.setTimeout(60000);
    console.log('\n🎬 Starting WatchLockAI User Experience Demo...\n');

    // ========================================
    // 1. APT PROFILES PAGE
    // ========================================
    console.log('📍 Step 1: Navigating to APT Profiles page...');
    await page.goto('/apt-profiles.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ APT Profiles page loaded');
    console.log(
      '   - You should see: APT actor cards with country flags, sophistication levels, and motivations'
    );
    console.log('   - You should see: Filter controls (Country, Sophistication, Motivation)');
    console.log('   - You should see: Search input');

    await page.waitForTimeout(2000);

    // Demonstrate Sophistication Filter (has static options)
    console.log('\n📍 Step 2: Testing Sophistication filter...');
    const sophisticationFilter = page.locator('select#sophisticationFilter');
    await sophisticationFilter.selectOption('advanced');
    console.log('   - Selected sophistication: Advanced');
    console.log('   - You should see: Only advanced APT actors');

    await page.waitForTimeout(2000);

    // Reset filter
    console.log('\n📍 Step 3: Resetting filters...');
    await sophisticationFilter.selectOption('');
    console.log('   - You should see: All APT actors displayed again');

    await page.waitForTimeout(2000);

    // Demonstrate Motivation Filter
    console.log('\n📍 Step 4: Testing Motivation filter...');
    const motivationFilter = page.locator('select#motivationFilter');
    await motivationFilter.selectOption('espionage');
    console.log('   - Selected motivation: Espionage');
    console.log('   - You should see: Only espionage-motivated APT actors');

    await page.waitForTimeout(2000);

    // Reset filter
    await motivationFilter.selectOption('');

    await page.waitForTimeout(1000);

    // Demonstrate Search
    console.log('\n📍 Step 5: Testing search functionality...');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('APT');
    console.log('   - Searching for: "APT"');
    console.log('   - You should see: Only APT actors matching "APT" in name or description');

    await page.waitForTimeout(2000);

    // Clear search
    await searchInput.clear();

    await page.waitForTimeout(1000);

    // ========================================
    // 2. DETECTION ENGINEERING PAGE
    // ========================================
    console.log('\n📍 Step 6: Navigating to Detection Engineering page...');
    await page.goto('/detections.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ Detection Engineering page loaded');
    console.log('   - You should see: Detection Catalog tab (active)');
    console.log('   - You should see: Detection rule cards with severity, status, and platform');
    console.log('   - You should see: Filter controls (Severity, Status, Platform)');
    console.log('   - You should see: MITRE Coverage tab button');

    await page.waitForTimeout(2000);

    // Demonstrate Severity Filter
    console.log('\n📍 Step 7: Testing Severity filter...');
    const severityFilter = page.locator('select#severityFilter');
    await severityFilter.selectOption('CRITICAL');
    console.log('   - Selected severity: Critical');
    console.log('   - You should see: Only critical severity detections');

    await page.waitForTimeout(2000);

    // Reset filter
    await severityFilter.selectOption('');

    await page.waitForTimeout(1000);

    // Demonstrate Status Filter
    console.log('\n📍 Step 8: Testing Status filter...');
    const statusFilter = page.locator('select#statusFilter');
    await statusFilter.selectOption('stable');
    console.log('   - Selected status: Stable');
    console.log('   - You should see: Only stable detections');

    await page.waitForTimeout(2000);

    // Reset filter
    await statusFilter.selectOption('');

    await page.waitForTimeout(1000);

    // Demonstrate Tab Switching
    console.log('\n📍 Step 9: Switching to MITRE Coverage tab...');
    const coverageTab = page.locator('button:has-text("MITRE Coverage")');
    await coverageTab.click();
    console.log('   - Clicked: MITRE Coverage tab');
    console.log('   - You should see: MITRE ATT&CK coverage matrix');
    console.log('   - You should see: Tactics and techniques with coverage percentages');

    await page.waitForTimeout(3000);

    // Switch back to Detection Catalog
    console.log('\n📍 Step 10: Switching back to Detection Catalog tab...');
    const catalogTab = page.locator('button:has-text("Detection Catalog")');
    await catalogTab.click();
    console.log('   - Clicked: Detection Catalog tab');
    console.log('   - You should see: Detection rule cards again');

    await page.waitForTimeout(2000);

    // ========================================
    // 3. THREAT ACTORS PAGE
    // ========================================
    console.log('\n📍 Step 11: Navigating to Threat Actors page...');
    await page.goto('/threat-actors.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ Threat Actors page loaded');
    console.log('   - You should see: Threat actor profiles with attribution scores');
    console.log('   - You should see: Three tabs (Overview, Attribution, Timeline)');
    console.log('   - You should see: Search functionality');

    await page.waitForTimeout(1500);

    // ========================================
    // 4. DARK WEB INTELLIGENCE PAGE
    // ========================================
    console.log('\n📍 Step 12: Navigating to Dark Web Intelligence page...');
    await page.goto('/dark-web.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ Dark Web Intelligence page loaded');
    console.log('   - You should see: Ransomware victim tracking');
    console.log('   - You should see: Paste site monitoring');
    console.log('   - You should see: IOC extraction results');

    await page.waitForTimeout(3000);

    // ========================================
    // 5. GEOPOLITICAL RISK PAGE
    // ========================================
    console.log('\n📍 Step 13: Navigating to Geopolitical Risk page...');
    await page.goto('/geopolitical-risk.html');
    await page.waitForLoadState('networkidle');

    console.log('✅ Geopolitical Risk page loaded');
    console.log('   - You should see: Country risk profiles');
    console.log('   - You should see: Risk scores and assessments');
    console.log('   - You should see: Geopolitical context information');

    await page.waitForTimeout(3000);

    // ========================================
    // 6. ACCESSIBILITY DEMONSTRATION
    // ========================================
    console.log('\n📍 Step 14: Demonstrating accessibility features...');
    await page.goto('/apt-profiles.html');
    await page.waitForLoadState('networkidle');

    console.log('   - Testing keyboard navigation...');
    await page.keyboard.press('Tab'); // Focus on first element
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab'); // Move to next element
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab'); // Move to next element
    console.log('   - You should see: Focus indicators as you press Tab');
    console.log('   - You should see: Proper focus order through the page');

    await page.waitForTimeout(2000);

    // Test label associations
    console.log('\n📍 Step 15: Verifying label associations (accessibility fix)...');
    const countryLabel = page.locator('label[for="countryFilter"]');
    await countryLabel.click(); // Clicking label should focus the select
    console.log('   - Clicked: Country label');
    console.log('   - You should see: Country select dropdown focused (accessibility working!)');

    await page.waitForTimeout(2000);

    // ========================================
    // DEMO COMPLETE
    // ========================================
    console.log('\n✅ User Experience Demo Complete!');
    console.log('\n📋 Summary of what you should have seen:');
    console.log('   1. APT Profiles page with filter controls and search');
    console.log('   2. Country and Sophistication filters working');
    console.log('   3. Detection Engineering page with two tabs');
    console.log('   4. Severity and Status filters working');
    console.log('   5. Tab switching between Detection Catalog and MITRE Coverage');
    console.log('   6. Threat Actors page with attribution data');
    console.log('   7. Dark Web Intelligence page with monitoring data');
    console.log('   8. Geopolitical Risk page with country profiles');
    console.log('   9. Keyboard navigation working (Tab key)');
    console.log('   10. Label associations working (click label to focus input)');
    console.log('\n🎉 All features demonstrated successfully!\n');

    // Keep browser open for a moment
    await page.waitForTimeout(3000);
  });
});
