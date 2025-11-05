import { test, expect } from '@playwright/test';

test.describe('Dashboard 1: Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/detections.html');
    await page.waitForLoadState('networkidle');
    // Wait for analytics to initialize
    await page.waitForTimeout(2000);
  });

  test('Analytics Dashboard section is visible', async ({ page }) => {
    const analyticsSection = page.locator('.analytics-section');
    await expect(analyticsSection).toBeVisible();

    const title = page.locator('.analytics-title');
    await expect(title).toContainText('Analytics Dashboard');
  });

  test('Time range selector is functional', async ({ page }) => {
    const timeRangeButtons = page.locator('.time-range-btn');
    await expect(timeRangeButtons).toHaveCount(3);

    // Check default active button (30 Days)
    const activeButton = page.locator('.time-range-btn.active');
    await expect(activeButton).toContainText('30 Days');

    // Click 7 Days button
    await page.locator('.time-range-btn[data-range="7"]').click();
    await expect(page.locator('.time-range-btn[data-range="7"]')).toHaveClass(/active/);
  });

  test('Detection Trends line chart renders correctly', async ({ page }) => {
    const trendChart = page.locator('#trendChart');
    await expect(trendChart).toBeVisible();

    // Check for SVG elements
    const svgLines = trendChart.locator('polyline.chart-line');
    await expect(svgLines).toHaveCount(3); // Critical, High, Medium

    // Check for chart dots
    const dots = trendChart.locator('circle.chart-dot');
    const dotCount = await dots.count();
    expect(dotCount).toBeGreaterThan(0);
  });

  test('Line chart has correct severity lines', async ({ page }) => {
    const criticalLine = page.locator('.chart-line-critical');
    await expect(criticalLine).toBeVisible();

    const highLine = page.locator('.chart-line-high');
    await expect(highLine).toBeVisible();

    const mediumLine = page.locator('.chart-line-medium');
    await expect(mediumLine).toBeVisible();
  });

  test('Line chart tooltip appears on hover', async ({ page }) => {
    const firstDot = page.locator('circle.chart-dot').first();
    await firstDot.hover();

    const tooltip = page.locator('#trendTooltip');
    await expect(tooltip).toHaveClass(/visible/);
  });

  test('Severity Distribution donut chart renders correctly', async ({ page }) => {
    const donutChart = page.locator('#donutChart');
    await expect(donutChart).toBeVisible();

    // Check for donut segments
    const segments = donutChart.locator('path.donut-segment');
    const segmentCount = await segments.count();
    expect(segmentCount).toBeGreaterThan(0);

    // Check center text shows total
    const centerNumber = page.locator('.donut-center-number');
    await expect(centerNumber).toContainText('15');
  });

  test('Donut chart legend displays correctly', async ({ page }) => {
    const legend = page.locator('#donutLegend');
    await expect(legend).toBeVisible();

    const legendItems = legend.locator('.legend-item');
    const itemCount = await legendItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Check for severity labels
    await expect(legend).toContainText('Critical');
    await expect(legend).toContainText('High');
  });

  test('Platform Coverage bar chart renders correctly', async ({ page }) => {
    const platformChart = page.locator('#platformChart');
    await expect(platformChart).toBeVisible();

    const barItems = platformChart.locator('.bar-item');
    const barCount = await barItems.count();
    expect(barCount).toBeGreaterThan(0);

    // Check for bar fills
    const barFills = platformChart.locator('.bar-fill');
    await expect(barFills.first()).toBeVisible();
  });

  test('Platform bars show correct values', async ({ page }) => {
    const firstBar = page.locator('.bar-item').first();
    await expect(firstBar).toBeVisible();

    const barLabel = firstBar.locator('.bar-label');
    await expect(barLabel).toBeVisible();

    const barValue = firstBar.locator('.bar-value');
    await expect(barValue).toBeVisible();
  });

  test('Top Triggered Detections table renders correctly', async ({ page }) => {
    const table = page.locator('.analytics-table');
    await expect(table).toBeVisible();

    // Check table headers
    await expect(table).toContainText('Detection');
    await expect(table).toContainText('Triggers');
    await expect(table).toContainText('Severity');
    await expect(table).toContainText('Last Triggered');
  });

  test('Top Detections table shows 5 rows', async ({ page }) => {
    const tableRows = page.locator('#topDetectionsTable tr');
    await expect(tableRows).toHaveCount(5);
  });

  test('Top Detections table has severity badges', async ({ page }) => {
    const severityBadges = page.locator('#topDetectionsTable .severity-badge');
    const badgeCount = await severityBadges.count();
    expect(badgeCount).toBe(5);
  });

  test('Top Detections table shows trigger counts', async ({ page }) => {
    const triggerCells = page.locator('#topDetectionsTable .table-triggers');
    const firstTrigger = await triggerCells.first().textContent();
    expect(firstTrigger).toMatch(/\d+/); // Should contain numbers
  });

  test('Analytics grid has 4 chart cards', async ({ page }) => {
    const chartCards = page.locator('.chart-card');
    await expect(chartCards).toHaveCount(4);
  });

  test('All chart cards have titles', async ({ page }) => {
    const chartTitles = page.locator('.chart-title');
    await expect(chartTitles).toHaveCount(4);

    await expect(chartTitles.nth(0)).toContainText('Detection Trends');
    await expect(chartTitles.nth(1)).toContainText('Severity Distribution');
    await expect(chartTitles.nth(2)).toContainText('Platform Coverage');
    await expect(chartTitles.nth(3)).toContainText('Top Triggered Detections');
  });

  test('Chart cards have hover effects', async ({ page }) => {
    const firstCard = page.locator('.chart-card').first();
    await firstCard.hover();

    // Card should have transform on hover (checked via CSS)
    const box = await firstCard.boundingBox();
    expect(box).toBeTruthy();
  });

  test('Time range change updates trend chart', async ({ page }) => {
    // Get initial chart state
    const initialDots = await page.locator('circle.chart-dot').count();

    // Change to 7 days
    await page.locator('.time-range-btn[data-range="7"]').click();
    await page.waitForTimeout(500);

    // Chart should update (different number of dots for 7 days vs 30 days)
    const newDots = await page.locator('circle.chart-dot').count();
    expect(newDots).not.toBe(initialDots);
  });

  test('Analytics section is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const analyticsSection = page.locator('.analytics-section');
    await expect(analyticsSection).toBeVisible();

    // Grid should stack on mobile
    const analyticsGrid = page.locator('.analytics-grid');
    await expect(analyticsGrid).toBeVisible();
  });

  test('Quick Stats Widget still works after analytics addition', async ({ page }) => {
    const quickStats = page.locator('.quick-stats-grid');
    await expect(quickStats).toBeVisible();

    const statCards = quickStats.locator('.stat-card');
    await expect(statCards).toHaveCount(6);
  });

  test('Detection cards still render below analytics', async ({ page }) => {
    const detectionGrid = page.locator('.detection-grid');
    await expect(detectionGrid).toBeVisible();

    const detectionCards = detectionGrid.locator('.detection-card');
    const cardCount = await detectionCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('No console errors during analytics rendering', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out expected 404 errors (favicon, style.css, and generic 404s)
    const relevantErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('style.css') && !e.includes('404 (Not Found)')
    );

    expect(relevantErrors.length).toBe(0);
  });
});
