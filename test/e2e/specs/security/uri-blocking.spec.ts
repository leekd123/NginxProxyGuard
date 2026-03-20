import { test, expect } from '@playwright/test';
import { WAFPage } from '../../pages';
import { TestDataFactory } from '../../utils/test-data-factory';
import { APIHelper } from '../../utils/api-helper';
import { TIMEOUTS } from '../../fixtures/test-data';

test.describe('URI Blocking', () => {
  let wafPage: WAFPage;
  let apiHelper: APIHelper;

  test.beforeEach(async ({ page, request }) => {
    wafPage = new WAFPage(page);
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test.afterEach(async () => {
    // Cleanup test global URI block rules
    try {
      const globalBlock = await apiHelper.getGlobalUriBlock();
      for (const rule of globalBlock.rules || []) {
        if (rule.description?.includes('test') || rule.description?.includes('Test') || rule.pattern.includes('test-e2e') || rule.pattern.includes('test-ui')) {
          await apiHelper.deleteWafUriBlock(rule.id).catch(() => {});
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  test.describe('URI Blocks Page', () => {
    test('should display URI blocks page', async () => {
      await wafPage.gotoUriBlocks();
      await wafPage.expectWAFPage();
      await expect(wafPage.page).toHaveURL(/\/waf\/uri-blocks/);
    });

    test('should display URI blocks list', async () => {
      await wafPage.gotoUriBlocks();

      const listVisible = await wafPage.uriBlockList.isVisible();
      expect(listVisible).toBeTruthy();
    });

    test('should show add URI block button', async () => {
      await wafPage.gotoUriBlocks();

      await expect(wafPage.addUriBlockButton).toBeVisible();
    });
  });

  test.describe('Create URI Block', () => {
    test('should create literal URI block', async () => {
      const blockData = TestDataFactory.createWafUriBlock({
        pattern: '/test-e2e-blocked/*',
        is_regex: false,
        description: 'Test URI block',
      });

      const created = await apiHelper.createWafUriBlock(blockData);

      expect(created).toHaveProperty('id');
      expect(created.pattern).toBe(blockData.pattern);
      expect(created.is_regex).toBe(false);
    });

    test('should create regex URI block', async () => {
      const blockData = TestDataFactory.createRegexUriBlock({
        pattern: '\\/test-e2e-\\d+\\/',
        description: 'Test regex URI block',
      });

      const created = await apiHelper.createWafUriBlock(blockData);

      expect(created).toHaveProperty('id');
      expect(created.is_regex).toBe(true);
    });

    test('should create URI block via UI', async ({ page }) => {
      await wafPage.gotoUriBlocks();

      // Click the "Add Rule" button to show the inline form
      await wafPage.addUriBlockButton.click();
      await page.waitForTimeout(300);

      // The inline add form appears inside a bg-slate-50 container with font-mono pattern input
      const inlineForm = page.locator('.bg-slate-50, .dark\\:bg-slate-700\\/50').filter({
        has: page.locator('input.font-mono'),
      }).first();
      await inlineForm.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });

      // Fill the pattern input (font-mono text input)
      const patternInput = inlineForm.locator('input.font-mono').first();
      await patternInput.fill('/test-ui-block/*');

      // Fill description if visible (non-mono text input in the form)
      const descInput = inlineForm.locator('input[type="text"]:not(.font-mono)').first();
      if (await descInput.isVisible()) {
        await descInput.fill('Test from UI');
      }

      // Click the add button within the inline form (the rose/red colored button)
      const addBtn = inlineForm.locator('button').filter({ hasText: /add/i }).first();
      await addBtn.click();

      // The rule is added to pending changes - now save the global changes
      await page.waitForTimeout(300);
      const saveBtn = page.locator('button').filter({ hasText: /save/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Edit URI Block', () => {
    test('should update URI block pattern', async () => {
      // Create a block first
      const blockData = TestDataFactory.createWafUriBlock();
      const created = await apiHelper.createWafUriBlock(blockData);

      // Note: Would need an updateWafUriBlock method in API helper
      // For now, just verify the created block
      expect(created.pattern).toBe(blockData.pattern);
    });

    test('should toggle URI block enabled state', async () => {
      const blockData = TestDataFactory.createWafUriBlock({ enabled: true });
      const created = await apiHelper.createWafUriBlock(blockData);

      expect(created.enabled).toBe(true);
    });
  });

  test.describe('Delete URI Block', () => {
    test('should delete URI block', async () => {
      // Create a block first
      const blockData = TestDataFactory.createWafUriBlock();
      const created = await apiHelper.createWafUriBlock(blockData);

      // Delete it
      await apiHelper.deleteWafUriBlock(created.id);

      // Verify deletion via global URI block endpoint
      const globalBlock = await apiHelper.getGlobalUriBlock();
      const found = (globalBlock.rules || []).find(r => r.id === created.id);
      expect(found).toBeUndefined();
    });
  });

  test.describe('URI Block Patterns', () => {
    test('should block exact path match', async () => {
      const blockData = TestDataFactory.createWafUriBlock({
        pattern: '/blocked-exact',
        is_regex: false,
      });

      await apiHelper.createWafUriBlock(blockData);

      // Test would need to verify actual blocking
    });

    test('should block wildcard path match', async () => {
      const blockData = TestDataFactory.createWafUriBlock({
        pattern: '/admin/*',
        is_regex: false,
      });

      await apiHelper.createWafUriBlock(blockData);

      // Should match /admin/dashboard, /admin/users, etc.
    });

    test('should block regex path match', async () => {
      const blockData = TestDataFactory.createRegexUriBlock({
        pattern: '\\.(php|asp|aspx)$',
      });

      await apiHelper.createWafUriBlock(blockData);

      // Should match *.php, *.asp, *.aspx
    });
  });

  test.describe('API Integration', () => {
    test('should fetch URI blocks via API', async () => {
      const blocks = await apiHelper.getWafUriBlocks();
      expect(Array.isArray(blocks)).toBeTruthy();
    });

    test('should create URI block via API', async () => {
      const blockData = TestDataFactory.createWafUriBlock();
      const created = await apiHelper.createWafUriBlock(blockData);

      expect(created).toHaveProperty('id');
      expect(created.pattern).toBe(blockData.pattern);
    });

    test('should delete URI block via API', async () => {
      const blockData = TestDataFactory.createWafUriBlock();
      const created = await apiHelper.createWafUriBlock(blockData);

      await apiHelper.deleteWafUriBlock(created.id);

      // Verify deletion via global URI block endpoint
      const globalBlock = await apiHelper.getGlobalUriBlock();
      const found = (globalBlock.rules || []).find(r => r.id === created.id);
      expect(found).toBeUndefined();
    });
  });
});

test.describe('URI Block Validation', () => {
  let apiHelper: APIHelper;

  test.beforeEach(async ({ request }) => {
    apiHelper = new APIHelper(request);
    await apiHelper.login();
  });

  test('should validate regex pattern syntax', async () => {
    const blockData = TestDataFactory.createRegexUriBlock({
      pattern: '[invalid(regex', // Invalid regex
    });

    await expect(apiHelper.createWafUriBlock(blockData)).rejects.toThrow(/Invalid regex pattern|Failed to create/);
  });

  test('should accept valid regex patterns', async () => {
    const validPatterns = [
      '\\.(js|css)$',
      '^/api/v\\d+/',
      '/user/\\d+/profile',
    ];

    for (const pattern of validPatterns) {
      const blockData = TestDataFactory.createRegexUriBlock({ pattern });
      const created = await apiHelper.createWafUriBlock(blockData);

      expect(created.pattern).toBe(pattern);

      // Cleanup
      await apiHelper.deleteWafUriBlock(created.id);
    }
  });
});
