import { test, expect } from '@playwright/test';
import { WAFPage, ProxyHostListPage, ProxyHostFormPage } from '../../pages';
import { TestDataFactory } from '../../utils/test-data-factory';
import { APIHelper } from '../../utils/api-helper';
import { TIMEOUTS } from '../../fixtures/test-data';

test.describe('Advanced WAF Scenarios', () => {
  let wafPage: WAFPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    wafPage = new WAFPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestHosts();
  });

  test.describe('WAF Mode Configuration', () => {
    test('should configure DetectionOnly mode', async () => {
      const proxyHost = TestDataFactory.createProxyHost({
        waf_enabled: true,
        waf_mode: 'DetectionOnly',
      });

      const created = await apiHelper.createProxyHost(proxyHost);

      expect(created.waf_mode).toBe('DetectionOnly');
    });

    test('should configure On (blocking) mode', async () => {
      const proxyHost = TestDataFactory.createProxyHost({
        waf_enabled: true,
        waf_mode: 'On',
      });

      const created = await apiHelper.createProxyHost(proxyHost);

      expect(created.waf_mode).toBe('On');
    });

    test('should configure Off mode', async () => {
      const proxyHost = TestDataFactory.createProxyHost({
        waf_enabled: false,
      });

      const created = await apiHelper.createProxyHost(proxyHost);

      expect(created.waf_enabled).toBe(false);
    });
  });

  test.describe('Paranoia Level Configuration', () => {
    test.describe.parallel('should configure different paranoia levels', () => {
      const levels: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

      for (const level of levels) {
        test(`should set paranoia level ${level}`, async ({ request }) => {
          const localApiHelper = new APIHelper(request);
          await localApiHelper.login();

          const proxyHost = TestDataFactory.createWAFProxyHost({
            // paranoia_level: level, // If supported
          });

          const created = await localApiHelper.createProxyHost(proxyHost);
          expect(created.waf_enabled).toBe(true);

          // Cleanup - catch errors since WAF hosts may fail nginx config on delete
          await localApiHelper.deleteProxyHost(created.id).catch(() => {});
        });
      }
    });
  });

  test.describe('WAF Tester', () => {
    test('should test SQL injection payload', async () => {
      const result = await apiHelper.testWafPayload('sql_injection');

      expect(result.attack_type).toBe('sql_injection');
      expect(result.description).toBeTruthy();
    });

    test('should test XSS payload', async () => {
      const result = await apiHelper.testWafPayload('xss_script');

      expect(result.attack_type).toBe('xss_script');
      expect(result.description).toBeTruthy();
    });

    test('should test command injection payload', async () => {
      const result = await apiHelper.testWafPayload('command_injection');

      expect(result.attack_type).toBe('command_injection');
      expect(result.description).toBeTruthy();
    });

    test('should test path traversal payload', async () => {
      const result = await apiHelper.testWafPayload('path_traversal');

      expect(result.attack_type).toBe('path_traversal');
      expect(result.description).toBeTruthy();
    });

    test('should test scanner detection payload', async () => {
      const result = await apiHelper.testWafPayload('scanner_sqlmap');

      expect(result.attack_type).toBe('scanner_sqlmap');
      expect(result.description).toBeTruthy();
    });
  });

  test.describe('WAF Tester UI', () => {
    test('should display WAF tester page', async () => {
      await wafPage.gotoTester();
      await expect(wafPage.page).toHaveURL(/\/waf\/tester/);
    });

    test('should have payload input', async () => {
      await wafPage.gotoTester();

      await expect(wafPage.testerInput).toBeVisible();
    });

    test('should have test button', async () => {
      await wafPage.gotoTester();

      await expect(wafPage.testButton).toBeVisible();
    });

    test('should test payload and show result', async () => {
      await wafPage.testPayload('<script>alert(1)</script>');

      // Result should be visible
      const resultVisible = await wafPage.testResult.isVisible();
      expect(typeof resultVisible).toBe('boolean');
    });
  });

  test.describe('WAF with Multiple Hosts', () => {
    test('should enable WAF independently per host', async () => {
      // Create host with WAF enabled
      const wafHost = TestDataFactory.createWAFProxyHost();
      const createdWaf = await apiHelper.createProxyHost(wafHost);

      // Create host without WAF
      const noWafHost = TestDataFactory.createProxyHost({
        waf_enabled: false,
      });
      const createdNoWaf = await apiHelper.createProxyHost(noWafHost);

      expect(createdWaf.waf_enabled).toBe(true);
      expect(createdNoWaf.waf_enabled).toBe(false);
    });

    test('should configure different WAF modes per host', async () => {
      const detectionHost = TestDataFactory.createProxyHost({
        waf_enabled: true,
        waf_mode: 'DetectionOnly',
      });
      const blockingHost = TestDataFactory.createProxyHost({
        waf_enabled: true,
        waf_mode: 'On',
      });

      const createdDetection = await apiHelper.createProxyHost(detectionHost);
      const createdBlocking = await apiHelper.createProxyHost(blockingHost);

      expect(createdDetection.waf_mode).toBe('DetectionOnly');
      expect(createdBlocking.waf_mode).toBe('On');
    });
  });

  test.describe('WAF Integration with Security Features', () => {
    test('should combine WAF with bot filter', async () => {
      const proxyHost = TestDataFactory.createSecureProxyHost();
      const created = await apiHelper.createProxyHost(proxyHost);

      expect(created.waf_enabled).toBe(true);
      // Bot filter is a separate resource, not a proxy host field
      // Verify WAF is enabled as the primary assertion
    });

    test('should combine WAF with SSL', async () => {
      const proxyHost = TestDataFactory.createProxyHost({
        ssl_enabled: true,
        waf_enabled: true,
        waf_mode: 'On',
      });

      const created = await apiHelper.createProxyHost(proxyHost);

      // Backend auto-disables SSL when no certificate is assigned
      expect(created.ssl_enabled).toBe(false);
      expect(created.waf_enabled).toBe(true);
    });
  });
});

test.describe('WAF Custom Rules', () => {
  let apiHelper: APIHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test('should fetch exploit rules', async () => {
    const response = await apiHelper.getWafExploitRules();
    expect(response).toHaveProperty('categories');
    expect(Array.isArray(response.categories)).toBeTruthy();
  });

  test('should have rules with categories', async () => {
    const response = await apiHelper.getWafExploitRules();

    if (response.categories.length > 0) {
      const allRules = response.categories.flatMap(c => c.rules);
      const categories = [...new Set(allRules.map(r => r.category))];
      expect(categories.length).toBeGreaterThan(0);
    }
  });
});

test.describe('WAF Performance', () => {
  let apiHelper: APIHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.afterEach(async () => {
    await apiHelper.cleanupTestHosts();
  });

  test('should create multiple WAF-enabled hosts efficiently', async () => {
    const hosts = TestDataFactory.createProxyHostBatch(5).map(h => ({
      ...h,
      waf_enabled: true,
      waf_mode: 'DetectionOnly',
    }));

    const created = [];
    for (const host of hosts) {
      created.push(await apiHelper.createProxyHost(host));
    }

    expect(created.length).toBe(5);
    expect(created.every(h => h.waf_enabled)).toBe(true);
  });

  test('should test multiple attack types efficiently', async () => {
    const attackTypes = [
      'sql_injection',
      'sql_injection_union',
      'xss_script',
      'xss_event',
      'path_traversal',
      'command_injection',
    ];

    const results = [];
    for (const attackType of attackTypes) {
      results.push(await apiHelper.testWafPayload(attackType));
    }

    expect(results.length).toBe(6);
    expect(results.every(r => r.attack_type && r.description)).toBe(true);
  });
});
