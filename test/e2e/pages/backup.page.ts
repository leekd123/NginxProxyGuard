import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES, TIMEOUTS } from '../fixtures/test-data';

/**
 * Backup & Restore page object model.
 */
export class BackupPage extends BasePage {
  // Page elements
  readonly pageTitle: Locator;

  // Create backup section
  readonly createBackupButton: Locator;
  readonly backupProgressIndicator: Locator;

  // Backup list
  readonly backupList: Locator;
  readonly backupItems: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  // Backup item actions
  readonly downloadButton: Locator;
  readonly restoreButton: Locator;
  readonly deleteButton: Locator;

  // Restore modal
  readonly restoreModal: Locator;
  readonly confirmRestoreButton: Locator;
  readonly cancelRestoreButton: Locator;
  readonly restoreWarning: Locator;

  // Upload backup section
  readonly uploadSection: Locator;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;

  // Status messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /backup|restore/i }).first();

    // Create backup section
    this.createBackupButton = page.locator('button').filter({ hasText: /create.*backup|new.*backup|backup.*now/i }).first();
    this.backupProgressIndicator = page.locator('.animate-spin, [class*="progress"]');

    // Backup list
    this.backupList = page.locator('main .space-y-4, main .grid, table, main > div').first();
    // Backup items are divs inside a divide-y container, each with p-4 class
    this.backupItems = page.locator('.divide-y > div, [class*="card"], tr').filter({
      has: page.locator('text=/\\.zip|\\.tar|backup|\\d{4}|completed|pending/i'),
    });
    this.emptyState = page.locator('text=/no.*backup|empty|no.*data/i');
    this.loadingState = page.locator('.animate-spin, .animate-pulse');

    // Backup item actions
    this.downloadButton = page.locator('button, a').filter({ hasText: /download/i }).first();
    this.restoreButton = page.locator('button').filter({ hasText: /restore/i }).first();
    this.deleteButton = page.locator('button').filter({ hasText: /delete/i }).first();

    // Restore modal
    this.restoreModal = page.locator('.fixed.inset-0, [role="dialog"], [class*="modal"]').first();
    this.confirmRestoreButton = page.locator('button').filter({ hasText: /confirm.*restore|yes.*restore|restore/i }).last();
    this.cancelRestoreButton = page.locator('button').filter({ hasText: /cancel/i }).first();
    this.restoreWarning = page.locator('text=/warning|caution|destructive|overwrite/i');

    // Upload backup section
    this.uploadSection = page.locator('section, div').filter({ hasText: /upload|import/i }).first();
    this.fileInput = page.locator('input[type="file"]').first();
    this.uploadButton = page.locator('button').filter({ hasText: /upload|import/i }).first();

    // Status messages
    this.successMessage = page.locator('text=/success|created|complete|restored/i');
    this.errorMessage = page.locator('.text-red-500, .text-red-600, [class*="error"]');
  }

  /**
   * Navigate to backups page.
   */
  async goto(): Promise<void> {
    await super.goto(ROUTES.settingsBackups);
    await this.waitForLoad();
  }

  /**
   * Wait for page to load.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await Promise.race([
      this.backupItems.first().waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.emptyState.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null),
      this.createBackupButton.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }),
    ]);
  }

  /**
   * Create a new backup.
   * The UI shows a confirmation modal with options before creating.
   */
  async createBackup(): Promise<void> {
    await this.createBackupButton.click();

    // Wait for confirmation modal to appear
    const modal = this.page.locator('.fixed.inset-0, [role="dialog"], [class*="modal"]').first();
    await modal.waitFor({ state: 'visible', timeout: TIMEOUTS.medium }).catch(() => null);

    // Click the "Create Backup" button inside the modal (not the page button)
    const modalCreateButton = modal.locator('button').filter({ hasText: /create.*backup/i }).first();
    if (await modalCreateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalCreateButton.click();
    }

    // Wait for backup to complete
    await this.page.waitForSelector('.animate-spin', { state: 'visible', timeout: TIMEOUTS.short }).catch(() => null);
    await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout: TIMEOUTS.veryLong }).catch(() => null);

    // Wait for modal to close
    await modal.waitFor({ state: 'hidden', timeout: TIMEOUTS.long }).catch(() => null);
    await this.waitForLoad();
  }

  /**
   * Get count of backups.
   */
  async getBackupCount(): Promise<number> {
    return await this.backupItems.count();
  }

  /**
   * Get backup by filename or date pattern.
   */
  getBackupByName(namePattern: string): Locator {
    return this.page.locator('.divide-y > div, [class*="card"], tr').filter({
      hasText: new RegExp(namePattern, 'i'),
    }).first();
  }

  /**
   * Get the most recent backup.
   */
  getMostRecentBackup(): Locator {
    return this.backupItems.first();
  }

  /**
   * Download a backup.
   */
  async downloadBackup(namePattern: string): Promise<void> {
    const backup = this.getBackupByName(namePattern);
    const downloadBtn = backup.locator('button, a').filter({ hasText: /download/i }).first();

    if (await downloadBtn.isVisible()) {
      // Setup download listener
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        downloadBtn.click(),
      ]);
      // Could save the download if needed
      await download.path();
    }
  }

  /**
   * Restore from a backup (DESTRUCTIVE OPERATION).
   */
  async restoreBackup(namePattern: string): Promise<void> {
    const backup = this.getBackupByName(namePattern);
    const restoreBtn = backup.locator('button').filter({ hasText: /restore/i }).first();

    if (await restoreBtn.isVisible()) {
      await restoreBtn.click();
    } else {
      // Try dropdown menu
      const menuBtn = backup.locator('button[title*="menu"], button:has(svg)').last();
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await this.page.locator('button, [role="menuitem"]').filter({ hasText: /restore/i }).click();
      }
    }

    // Wait for confirmation modal
    await this.restoreModal.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
  }

  /**
   * Confirm restore operation.
   */
  async confirmRestore(): Promise<void> {
    await this.confirmRestoreButton.click();
    // Wait for restore to complete
    await this.page.waitForSelector('.animate-spin', { state: 'visible', timeout: TIMEOUTS.short }).catch(() => null);
    await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout: TIMEOUTS.veryLong }).catch(() => null);
  }

  /**
   * Cancel restore operation.
   */
  async cancelRestore(): Promise<void> {
    await this.cancelRestoreButton.click();
    await this.restoreModal.waitFor({ state: 'hidden', timeout: TIMEOUTS.short });
  }

  /**
   * Delete a backup.
   */
  async deleteBackup(namePattern: string): Promise<void> {
    const backup = this.getBackupByName(namePattern);
    const deleteBtn = backup.locator('button').filter({ hasText: /delete/i }).first();

    // Set up dialog handler for the browser confirm() dialog
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    } else {
      // Try dropdown menu
      const menuBtn = backup.locator('button[title*="menu"], button:has(svg)').last();
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await this.page.locator('button, [role="menuitem"]').filter({ hasText: /delete/i }).first().click();
      }
    }

    await this.page.waitForTimeout(500);
    await this.waitForLoad();
  }

  /**
   * Upload a backup file.
   */
  async uploadBackup(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
    if (await this.uploadButton.isVisible()) {
      await this.uploadButton.click();
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if backup exists.
   */
  async backupExists(namePattern: string): Promise<boolean> {
    return await this.getBackupByName(namePattern).isVisible();
  }

  /**
   * Get backup size.
   */
  async getBackupSize(namePattern: string): Promise<string | null> {
    const backup = this.getBackupByName(namePattern);
    // Size is rendered as formatted text like "1.5 MB" or "256 KB" inside a span
    // It's in a flex-wrap gap-4 container alongside date and type
    const sizeLocator = backup.locator('span, text').filter({
      hasText: /\d+(\.\d+)?\s*(B|KB|MB|GB)\b/,
    }).first();
    if (await sizeLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await sizeLocator.textContent();
    }
    // Fallback: get all text and extract size pattern
    const allText = await backup.textContent() || '';
    const match = allText.match(/\d+(?:\.\d+)?\s*(?:B|KB|MB|GB)\b/);
    return match ? match[0] : null;
  }

  /**
   * Get backup date.
   */
  async getBackupDate(namePattern: string): Promise<string | null> {
    const backup = this.getBackupByName(namePattern);
    // Date is rendered via toLocaleString() which varies by locale.
    // Fallback: extract date-like text from the backup item.
    const allText = await backup.textContent() || '';
    // Match various date formats: YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY, or locale-specific
    const match = allText.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4}/);
    return match ? match[0] : (allText.length > 0 ? allText.substring(0, 50) : null);
  }

  /**
   * Check for success message.
   */
  async hasSuccessMessage(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  /**
   * Check for error message.
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.count() > 0;
  }

  /**
   * Verify page is loaded correctly.
   */
  async expectBackupPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings\/backups/);
    await expect(this.createBackupButton).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /**
   * Verify empty state is shown.
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }
}
