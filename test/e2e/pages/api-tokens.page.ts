import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES, TIMEOUTS } from '../fixtures/test-data';

/**
 * API Tokens management page object model.
 * API Tokens is a tab inside the Account Settings modal (.fixed.inset-0).
 * The create form is inline (toggled by "Create Token" button), not a sub-modal.
 * After creation, a separate modal (.fixed.inset-0 z-50) shows the generated token.
 * Token list uses a <table> with <tr> rows.
 * Delete and revoke use native confirm() dialogs.
 */
export class ApiTokensPage extends BasePage {
  // The Account Settings modal container
  readonly accountModal: Locator;

  // Token list (table-based)
  readonly tokenTable: Locator;
  readonly tokenRows: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  // Create form (inline, not a modal)
  readonly createTokenToggleButton: Locator;
  readonly addTokenButton: Locator; // Alias for createTokenToggleButton
  readonly nameInput: Locator;
  readonly createSubmitButton: Locator;
  readonly cancelButton: Locator;

  // Permission group buttons (read_only, operator, admin)
  readonly readOnlyGroupButton: Locator;
  readonly operatorGroupButton: Locator;
  readonly fullAccessGroupButton: Locator;

  // Individual permission checkboxes
  readonly permissionCheckboxes: Locator;

  // Token display modal (shown after creation)
  readonly tokenDisplayModal: Locator;
  readonly tokenDisplay: Locator;
  readonly copyTokenButton: Locator;
  readonly tokenWarning: Locator;
  readonly closeTokenModalButton: Locator;

  // Status messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Account Settings modal
    this.accountModal = page.locator('.fixed.inset-0').first();

    // Token list - table rows within the API tokens tab
    this.tokenTable = page.locator('table').first();
    this.tokenRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('td[colspan]'), // Exclude the "no tokens" empty state row
    });
    this.emptyState = page.locator('td[colspan]').filter({ hasText: /no.*token|empty/i });
    this.loadingState = page.locator('.animate-spin');

    // Create form toggle button - the "Create Token" button in the header area
    this.createTokenToggleButton = page.locator('button').filter({ hasText: /create.*token/i }).first();
    this.addTokenButton = this.createTokenToggleButton; // Alias

    // Form fields (visible when create form is shown)
    this.nameInput = page.locator('input[placeholder="My API Token"], input[placeholder*="API Token"]').first();
    // Submit button is also "Create Token" text but is type="submit" inside the form
    this.createSubmitButton = page.locator('form button[type="submit"]').first();
    this.cancelButton = page.locator('form button[type="button"]').filter({ hasText: /cancel/i }).first();

    // Permission group buttons
    this.readOnlyGroupButton = page.locator('form button[type="button"]').filter({ hasText: /read only/i }).first();
    this.operatorGroupButton = page.locator('form button[type="button"]').filter({ hasText: /operator/i }).first();
    this.fullAccessGroupButton = page.locator('form button[type="button"]').filter({ hasText: /full access/i }).first();

    // Individual permission checkboxes (inside the form's permission grid)
    this.permissionCheckboxes = page.locator('form input[type="checkbox"]');

    // Token display modal (appears after successful creation, separate .fixed.inset-0 with z-50)
    this.tokenDisplayModal = page.locator('.fixed.inset-0.bg-black');
    this.tokenDisplay = page.locator('.fixed.inset-0 code').first();
    this.copyTokenButton = page.locator('.fixed.inset-0 button').filter({ hasText: /copy/i }).first();
    this.tokenWarning = page.locator('text=/won.*t.*shown.*again|copy.*safe/i');
    // The token display modal has z-50 and bg-black, its Close button is at the bottom
    this.closeTokenModalButton = page.locator('.fixed.inset-0.bg-black button, .fixed.inset-0 .bg-black button').filter({ hasText: /close|닫기/i }).first();

    // Status messages
    this.successMessage = page.locator('text=/success|created|generated/i');
    this.errorMessage = page.locator('.text-red-500, .text-red-600, [class*="error"]');
  }

  /**
   * Navigate to API tokens by opening Account Settings modal and clicking API Tokens tab.
   */
  async goto(): Promise<void> {
    await super.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    // Click the username button in the header to open Account Settings modal
    const userButton = this.page.locator('header button').filter({
      has: this.page.locator('.text-sm.font-medium'),
    }).first();
    await userButton.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    await userButton.click();
    // Wait for modal to appear
    await this.page.locator('.fixed.inset-0, [role="dialog"]').first()
      .waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    // Click the API Tokens tab
    const apiTokensTab = this.page.locator('button').filter({ hasText: /api.*token/i }).first();
    await apiTokensTab.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    await apiTokensTab.click();
    await this.waitForLoad();
  }

  /**
   * Wait for API tokens content to load.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for either the token table or create button to appear
    await Promise.race([
      this.tokenTable.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.createTokenToggleButton.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.page.waitForTimeout(TIMEOUTS.short),
    ]);
  }

  /**
   * Click the "Create Token" button to show the inline create form.
   * The form is inline (not a sub-modal).
   */
  async clickAddToken(): Promise<void> {
    await this.createTokenToggleButton.click();
    // Wait for the form to appear (name input becomes visible)
    await this.nameInput.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
  }

  /**
   * Get count of tokens in the table (excluding empty state row).
   */
  async getTokenCount(): Promise<number> {
    return await this.tokenRows.count();
  }

  /**
   * Get token row by name.
   */
  getTokenByName(name: string): Locator {
    return this.page.locator('table tbody tr').filter({
      hasText: name,
    }).first();
  }

  /**
   * Fill token name.
   */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Select Read Only permission group.
   */
  async selectReadOnlyGroup(): Promise<void> {
    await this.readOnlyGroupButton.click();
  }

  /**
   * Select Operator permission group.
   */
  async selectOperatorGroup(): Promise<void> {
    await this.operatorGroupButton.click();
  }

  /**
   * Select Full Access permission group.
   */
  async selectFullAccessGroup(): Promise<void> {
    await this.fullAccessGroupButton.click();
  }

  /**
   * Select Read All permission (uses the Read Only group button).
   */
  async selectReadAllPermission(): Promise<void> {
    await this.selectReadOnlyGroup();
  }

  /**
   * Select Write All permission (uses the Full Access group button).
   */
  async selectWriteAllPermission(): Promise<void> {
    await this.selectFullAccessGroup();
  }

  /**
   * Select specific individual permissions by toggling checkboxes.
   * Permission format: "proxy:read", "certificate:write", etc.
   */
  async selectPermissions(permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      // Find the checkbox label containing the permission text
      const label = this.page.locator('form label').filter({
        has: this.page.locator('input[type="checkbox"]'),
      }).filter({
        hasText: new RegExp(permission.replace(':', '.*'), 'i'),
      }).first();

      if (await label.isVisible()) {
        const checkbox = label.locator('input[type="checkbox"]');
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.click();
        }
      }
    }
  }

  /**
   * Create a new API token with full workflow.
   */
  async createToken(config: {
    name: string;
    permissions?: string[];
    readAll?: boolean;
    writeAll?: boolean;
    expiresAt?: string;
  }): Promise<string | null> {
    await this.clickAddToken();
    await this.fillName(config.name);

    if (config.readAll) {
      await this.selectReadOnlyGroup();
    }

    if (config.writeAll) {
      await this.selectFullAccessGroup();
    }

    if (config.permissions?.length) {
      await this.selectPermissions(config.permissions);
    }

    await this.save();

    // Try to capture the generated token from the display modal
    try {
      await this.tokenDisplay.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
      return await this.tokenDisplay.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Submit the create form.
   */
  async save(): Promise<void> {
    await this.createSubmitButton.click();
    // Wait for either token display modal or error
    await Promise.race([
      this.tokenDisplay.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.errorMessage.first().waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.page.waitForTimeout(3000),
    ]);
  }

  /**
   * Close the token display modal (after viewing/copying the generated token).
   */
  async closeTokenModal(): Promise<void> {
    await this.closeTokenModalButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Close the modal (alias for closeTokenModal for backward compat).
   */
  async closeModal(): Promise<void> {
    await this.closeTokenModal();
  }

  /**
   * Copy the displayed token.
   */
  async copyToken(): Promise<void> {
    if (await this.copyTokenButton.isVisible()) {
      await this.copyTokenButton.click();
    }
  }

  /**
   * Revoke a token by name. Uses native confirm() dialog.
   */
  async revokeToken(name: string): Promise<void> {
    const tokenRow = this.getTokenByName(name);
    // Match both English "Revoke" and Korean "비활성화"
    const revokeBtn = tokenRow.locator('button').filter({ hasText: /revoke|비활성화/i }).first();

    // Use Playwright's dialog event handler to accept the confirm dialog
    this.page.once('dialog', dialog => dialog.accept());
    await revokeBtn.click();

    // Wait for the mutation to complete
    await this.page.waitForTimeout(3000);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Delete a token by name. Uses native confirm() dialog.
   */
  async deleteToken(name: string): Promise<void> {
    const tokenRow = this.getTokenByName(name);
    // Match both English "Delete" and Korean "삭제"
    const deleteBtn = tokenRow.locator('button').filter({ hasText: /delete|삭제/i }).first();

    // Use Playwright's dialog event handler to accept the confirm dialog
    this.page.once('dialog', dialog => dialog.accept());
    await deleteBtn.click();

    // Wait for the token row to be removed from the DOM after React Query refetches
    await tokenRow.waitFor({ state: 'hidden', timeout: TIMEOUTS.medium });
  }

  /**
   * Check if token exists in the table.
   */
  async tokenExists(name: string): Promise<boolean> {
    const tokenRow = this.getTokenByName(name);
    return await tokenRow.isVisible();
  }

  /**
   * Get token last used text.
   */
  async getTokenLastUsed(name: string): Promise<string | null> {
    const tokenRow = this.getTokenByName(name);
    // Last used is in the 4th column (index 3)
    const lastUsedCell = tokenRow.locator('td').nth(3);
    if (await lastUsedCell.isVisible()) {
      return await lastUsedCell.textContent();
    }
    return null;
  }

  /**
   * Check for validation errors.
   */
  async hasValidationErrors(): Promise<boolean> {
    return await this.errorMessage.count() > 0;
  }

  /**
   * Verify API Tokens section is loaded correctly inside the Account Settings modal.
   */
  async expectApiTokensPage(): Promise<void> {
    await expect(this.accountModal).toBeVisible({ timeout: TIMEOUTS.medium });
    // Either the create button or the token table should be visible
    const hasCreateBtn = await this.createTokenToggleButton.isVisible();
    const hasTable = await this.tokenTable.isVisible();
    expect(hasCreateBtn || hasTable).toBeTruthy();
  }

  /**
   * Verify empty state is shown.
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }
}
