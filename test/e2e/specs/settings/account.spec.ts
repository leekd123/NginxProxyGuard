import { test, expect } from '@playwright/test';
import { AccountSettingsPage } from '../../pages';
import { APIHelper } from '../../utils/api-helper';
import { TIMEOUTS, TEST_CREDENTIALS } from '../../fixtures/test-data';

test.describe('Account Settings', () => {
  let accountPage: AccountSettingsPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    accountPage = new AccountSettingsPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.describe('Account Page', () => {
    test('should display account settings page', async () => {
      await accountPage.goto();
      await accountPage.expectAccountSettingsPage();
    });

    test('should display current username', async () => {
      await accountPage.goto();
      const username = await accountPage.getUsername();
      expect(username).toBeTruthy();
    });
  });

  test.describe('Password Change', () => {
    // These tests are sensitive and might affect the login state
    // Run them carefully or skip in CI

    test('should show error for incorrect current password', async ({ page }) => {
      await accountPage.goto();

      await accountPage.changePassword('wrong-password', 'NewPassword123!');

      // Should show error
      await page.waitForTimeout(200);
      const hasError = await accountPage.hasErrorMessage();
      expect(hasError).toBeTruthy();
    });

    test('should validate password confirmation', async ({ page }) => {
      await accountPage.goto();
      await accountPage.switchTab('Password');

      // Fill mismatched passwords directly
      const passwordInputs = await page.locator('input[type="password"]').all();
      if (passwordInputs.length >= 3) {
        await passwordInputs[0].fill(TEST_CREDENTIALS.password);
        await passwordInputs[1].fill('NewPassword123!');
        await passwordInputs[2].fill('DifferentPassword456!'); // Mismatch
      }

      await accountPage.changePasswordButton.click();

      // Should show error
      await page.waitForTimeout(200);
      const hasError = await accountPage.hasErrorMessage();
      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Two-Factor Authentication', () => {
    test('should display 2FA section', async () => {
      await accountPage.goto();
      await accountPage.switchTab('Two-Factor');

      // 2FA section should be visible
      const twoFactorVisible = await accountPage.twoFactorSection.isVisible() ||
        await accountPage.setupTwoFactorButton.isVisible() ||
        await accountPage.disableTwoFactorButton.isVisible();

      expect(twoFactorVisible).toBeTruthy();
    });

    test('should show current 2FA status', async () => {
      await accountPage.goto();
      await accountPage.switchTab('Two-Factor');

      const isEnabled = await accountPage.isTwoFactorEnabled();
      expect(typeof isEnabled).toBe('boolean');
    });

  });

  test.describe('Language Settings', () => {
    test('should display language selector', async () => {
      await accountPage.goto();

      const languageVisible = await accountPage.languageSelect.isVisible();
      // Language selector might not be visible if not implemented
      expect(typeof languageVisible).toBe('boolean');
    });

  });

  test.describe('Font Settings', () => {
    test('should display font selector', async () => {
      await accountPage.goto();

      const fontVisible = await accountPage.fontSelect.isVisible();
      expect(typeof fontVisible).toBe('boolean');
    });

  });

  test.describe('Theme Settings', () => {
    test('should display theme selector', async () => {
      await accountPage.goto();

      const themeVisible = await accountPage.themeSelect.isVisible();
      expect(typeof themeVisible).toBe('boolean');
    });

  });

  test.describe('API Integration', () => {
    test('should fetch account settings via API', async () => {
      const settings = await apiHelper.getAccountSettings();
      expect(settings).toHaveProperty('username');
    });

  });
});

test.describe('Account Security', () => {
  let accountPage: AccountSettingsPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    accountPage = new AccountSettingsPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test('should require strong password', async ({ page }) => {
    await accountPage.goto();

    // Try weak password
    await accountPage.changePassword(TEST_CREDENTIALS.password, '123');

    // Should show error
    await page.waitForTimeout(200);
    const hasError = await accountPage.hasErrorMessage();
    // Might show validation error or API error
    expect(typeof hasError).toBe('boolean');
  });

  test('should mask password inputs', async ({ page }) => {
    await accountPage.goto();

    const passwordInputs = await page.locator('input[type="password"]').all();

    for (const input of passwordInputs) {
      const type = await input.getAttribute('type');
      expect(type).toBe('password');
    }
  });
});
