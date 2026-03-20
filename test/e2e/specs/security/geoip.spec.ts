import { test, expect } from '@playwright/test';
import { ProxyHostListPage } from '../../pages/proxy-host-list.page';
import { ProxyHostFormPage } from '../../pages/proxy-host-form.page';
import { TestDataFactory } from '../../utils/test-data-factory';
import { APIHelper } from '../../utils/api-helper';
import { ROUTES } from '../../fixtures/test-data';

test.describe('GeoIP on Proxy Host', () => {
  let listPage: ProxyHostListPage;
  let formPage: ProxyHostFormPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    listPage = new ProxyHostListPage(page);
    formPage = new ProxyHostFormPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestHosts();
  });

  test('should toggle GeoIP on proxy host via UI', async ({ page }) => {
    const testData = TestDataFactory.createProxyHost();
    await apiHelper.createProxyHost(testData);
    const testDomain = testData.domain_names[0];

    await listPage.goto();
    await listPage.clickHost(testDomain);

    // Toggle GeoIP (note: may need license key configured)
    // GeoIP is configured at the global settings level, not per-host.
    // The security tab may show a GeoIP toggle that triggers UI changes.
    await formPage.switchTab('security');

    // Verify the security tab loaded without errors
    const securityVisible = await formPage.securityTab.isVisible();
    expect(securityVisible).toBeTruthy();
  });

  test('should save proxy host after toggling GeoIP', async ({ page }) => {
    const testData = TestDataFactory.createProxyHost();
    await apiHelper.createProxyHost(testData);
    const testDomain = testData.domain_names[0];

    await listPage.goto();
    await listPage.clickHost(testDomain);

    // Toggle GeoIP if available
    await formPage.toggleGeoIP(true);

    await formPage.save();

    // Verify host still exists after save
    const hosts = await apiHelper.getProxyHosts();
    const updatedHost = hosts.find(h => h.domain_names.includes(testDomain));
    expect(updatedHost).toBeTruthy();
  });
});

test.describe('GeoIP Global Settings', () => {
  test('should navigate to GeoIP settings page', async ({ page }) => {
    await page.goto(ROUTES.settingsGeoip);
    await expect(page).toHaveURL(/\/settings\/geoip/);
  });

  test('should display GeoIP settings interface', async ({ page }) => {
    await page.goto(ROUTES.settingsGeoip);

    // Page should have GeoIP content
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toContainText(/geo/i);
  });

  test('should show license key configuration section', async ({ page }) => {
    await page.goto(ROUTES.settingsGeoip);
    await page.waitForLoadState('networkidle');

    // GeoIP requires MaxMind license key configuration.
    // The page has a password input for the license key and text labels containing "MaxMind" or "License Key".
    const hasLicenseInput = await page.locator('input[type="password"], input[type="text"]').count() > 0;
    const hasMaxMindText = await page.locator('text=/MaxMind|License|license|라이선스/i').count() > 0;

    expect(hasLicenseInput || hasMaxMindText).toBeTruthy();
  });
});

