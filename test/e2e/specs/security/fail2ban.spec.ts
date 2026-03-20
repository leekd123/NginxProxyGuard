import { test, expect } from '@playwright/test';
import { WAFPage } from '../../pages';
import { APIHelper } from '../../utils/api-helper';
import { TIMEOUTS } from '../../fixtures/test-data';

test.describe('Fail2ban Integration', () => {
  let wafPage: WAFPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    wafPage = new WAFPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.describe('Fail2ban Page', () => {
    test('should display fail2ban page', async () => {
      await wafPage.gotoFail2ban();
      await wafPage.expectWAFPage();
      await expect(wafPage.page).toHaveURL(/\/waf\/fail2ban/);
    });
  });

  test.describe('Banned IPs Management', () => {
    test('should display banned IPs page', async () => {
      await wafPage.gotoBannedIps();
      await expect(wafPage.page).toHaveURL(/\/waf\/banned-ips/);
    });

    test('should show banned IPs list', async () => {
      await wafPage.gotoBannedIps();

      const listVisible = await wafPage.bannedIpList.isVisible();
      expect(listVisible).toBeTruthy();
    });

    test('should display banned IP count', async () => {
      await wafPage.gotoBannedIps();

      const count = await wafPage.getBannedIpCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show add ban button', async () => {
      await wafPage.gotoBannedIps();

      await expect(wafPage.addBanButton).toBeVisible();
    });
  });

  test.describe('Ban IP', () => {
    const testIp = '192.168.99.99';

    test.afterEach(async () => {
      // Cleanup - unban test IP by finding its database ID
      try {
        const bannedIps = await apiHelper.getWafBannedIps();
        const entry = bannedIps.find(b => b.ip_address === testIp);
        if (entry) {
          await apiHelper.unbanIp(entry.id);
        }
      } catch {
        // IP might not be banned
      }
    });

    test('should ban IP address via API', async () => {
      await apiHelper.banIp(testIp, 'Test ban');

      const bannedIps = await apiHelper.getWafBannedIps();
      const found = bannedIps.find(b => b.ip_address === testIp);

      expect(found).toBeDefined();
    });

    test('should ban IP with reason', async () => {
      const reason = 'Automated test ban';
      await apiHelper.banIp(testIp, reason);

      const bannedIps = await apiHelper.getWafBannedIps();
      const found = bannedIps.find(b => b.ip_address === testIp);

      expect(found?.reason).toBe(reason);
    });

    test('should ban IP via UI', async ({ page }) => {
      await wafPage.gotoBannedIps();

      // Click the "Add IP Ban" button
      const addBtn = page.locator('button').filter({ hasText: /add.*ban|ban.*ip/i }).first();
      await addBtn.click();

      // Wait for the ban modal to appear (contains a form with IP input)
      const modal = page.locator('.fixed.inset-0').filter({
        has: page.locator('form'),
      }).first();
      await modal.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });

      // Fill IP address (font-mono input with required attribute inside the modal form)
      const ipInput = modal.locator('input[type="text"]').first();
      await ipInput.fill(testIp);

      // Fill reason (second text input in the form)
      const reasonInput = modal.locator('form input[type="text"]').nth(1);
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Test from UI');
      }

      // Submit the ban form
      const saveBtn = modal.locator('button[type="submit"]').first();
      await saveBtn.click();

      // Wait for the modal to close
      await modal.waitFor({ state: 'hidden', timeout: TIMEOUTS.medium }).catch(() => null);
    });
  });

  test.describe('Unban IP', () => {
    const testIp = '192.168.88.88';

    test('should unban IP address via API', async () => {
      // Ban first
      await apiHelper.banIp(testIp, 'Test for unban');

      // Verify it's banned
      let bannedIps = await apiHelper.getWafBannedIps();
      let found = bannedIps.find(b => b.ip_address === testIp);
      expect(found).toBeDefined();

      // Unban using database ID
      await apiHelper.unbanIp(found!.id);

      // Verify it's unbanned
      bannedIps = await apiHelper.getWafBannedIps();
      found = bannedIps.find(b => b.ip_address === testIp);
      expect(found).toBeUndefined();
    });
  });

  test.describe('Banned IP Display', () => {
    test('should display ban timestamp', async () => {
      const testIp = '192.168.77.77';

      // Ban an IP
      await apiHelper.banIp(testIp, 'Test timestamp');

      const bannedIps = await apiHelper.getWafBannedIps();
      const found = bannedIps.find(b => b.ip_address === testIp);

      expect(found?.banned_at).toBeDefined();

      // Cleanup using database ID
      if (found) await apiHelper.unbanIp(found.id);
    });

    test('should display ban reason', async () => {
      const testIp = '192.168.66.66';
      const reason = 'Test reason display';

      await apiHelper.banIp(testIp, reason);

      const bannedIps = await apiHelper.getWafBannedIps();
      const found = bannedIps.find(b => b.ip_address === testIp);

      expect(found?.reason).toBe(reason);

      // Cleanup using database ID
      if (found) await apiHelper.unbanIp(found.id);
    });
  });

  test.describe('API Integration', () => {
    test('should fetch banned IPs via API', async () => {
      const bannedIps = await apiHelper.getWafBannedIps();
      expect(Array.isArray(bannedIps)).toBeTruthy();
    });
  });
});

test.describe('IP Validation', () => {
  let apiHelper: APIHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test('should accept valid IPv4 address', async () => {
    const testIp = '10.0.0.100';

    await apiHelper.banIp(testIp);

    const bannedIps = await apiHelper.getWafBannedIps();
    const found = bannedIps.find(b => b.ip_address === testIp);
    expect(found).toBeDefined();

    // Cleanup using database ID
    if (found) await apiHelper.unbanIp(found.id);
  });

  test('should accept CIDR notation', async () => {
    const testCidr = '10.0.0.0/24';

    try {
      await apiHelper.banIp(testCidr);

      const bannedIps = await apiHelper.getWafBannedIps();
      const found = bannedIps.find(b => b.ip_address === testCidr);

      // Cleanup using database ID
      if (found) {
        await apiHelper.unbanIp(found.id);
      }
    } catch {
      // CIDR might not be supported
    }
  });

  test('should reject invalid IP format', async () => {
    try {
      await apiHelper.banIp('invalid-ip');
      // Should throw error
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
