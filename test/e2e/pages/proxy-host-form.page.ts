import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS } from '../fixtures/test-data';

/**
 * Proxy Host Form (modal) page object model.
 * The form is a multi-tab wizard inside a .fixed.inset-0 modal overlay.
 * In create mode, "Save/Create" only appears on the last tab; other tabs show "Next".
 * In edit mode, "Save" is always visible.
 */
export class ProxyHostFormPage {
  readonly page: Page;

  // Modal container
  readonly modal: Locator;
  readonly closeButton: Locator;

  // Tabs (have emoji prefixes like "🌐 Basic", "🔒 SSL/TLS")
  readonly basicTab: Locator;
  readonly sslTab: Locator;
  readonly securityTab: Locator;
  readonly performanceTab: Locator;
  readonly advancedTab: Locator;
  readonly protectionTab: Locator;

  // Basic tab fields
  readonly domainInput: Locator;
  readonly addDomainButton: Locator;
  readonly domainChips: Locator;
  readonly forwardSchemeSelect: Locator;
  readonly forwardHostInput: Locator;
  readonly forwardPortInput: Locator;
  readonly enabledToggle: Locator;

  // SSL tab fields
  readonly sslEnabledToggle: Locator;
  readonly http2Toggle: Locator;
  readonly http3Toggle: Locator;
  readonly forceHttpsToggle: Locator;
  readonly hstsToggle: Locator;
  readonly certificateSelect: Locator;

  // Security tab fields
  readonly wafEnabledToggle: Locator;
  readonly wafModeSelect: Locator;
  readonly paranoiaLevelSelect: Locator;
  readonly botFilterToggle: Locator;
  readonly geoipToggle: Locator;

  // Save progress modal
  readonly saveProgressModal: Locator;
  readonly saveProgressSpinner: Locator;
  readonly saveSuccessMessage: Locator;
  readonly saveErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Modal container - the fixed overlay
    this.modal = page.locator('.fixed.inset-0').first();
    this.closeButton = this.modal.locator('button').filter({ has: page.locator('svg') }).first();

    // Tabs - scoped to the form modal, handle emoji prefixes
    const formArea = page.locator('.fixed.inset-0');
    this.basicTab = formArea.locator('button, [role="tab"]').filter({ hasText: /basic/i }).first();
    this.sslTab = formArea.locator('button, [role="tab"]').filter({ hasText: /ssl/i }).first();
    this.securityTab = formArea.locator('button, [role="tab"]').filter({ hasText: /security/i }).first();
    this.performanceTab = formArea.locator('button, [role="tab"]').filter({ hasText: /performance/i }).first();
    this.advancedTab = formArea.locator('button, [role="tab"]').filter({ hasText: /advanced/i }).first();
    this.protectionTab = formArea.locator('button, [role="tab"]').filter({ hasText: /protection/i }).first();

    // Basic tab fields
    this.domainInput = page.locator('input[placeholder*="domain"], input[placeholder*="example.com"]').first();
    this.addDomainButton = page.locator('button').filter({ hasText: /add.*domain/i }).first();
    this.domainChips = page.locator('[class*="chip"], [class*="tag"], .bg-slate-100');
    this.forwardSchemeSelect = page.locator('select, [role="combobox"]').filter({ has: page.locator('option:has-text("http"), [role="option"]:has-text("http")') }).first();
    this.forwardHostInput = page.locator('input[placeholder*="192.168"], input[placeholder*="container_name"]').first();
    this.forwardPortInput = page.locator('input[placeholder="80"], input[inputmode="numeric"]').first();
    this.enabledToggle = page.locator('input[type="checkbox"], button[role="switch"]').first();

    // SSL tab fields
    // SSLTab uses a custom button toggle inside a border-2 card with "SSL Enabled" text.
    // We must NOT match the host ON/OFF toggle at the top of the form, so we scope
    // to the border-2 container that specifically contains the SSL toggle.
    this.sslEnabledToggle = page.locator('.border-2').filter({
      has: page.locator('text=/SSL Enabled|SSL 활성화/'),
    }).locator('button.rounded-full').first();
    this.http2Toggle = page.locator('input[type="checkbox"], button[role="switch"]').filter({ has: page.locator('text=/http.*2/i') }).first();
    this.http3Toggle = page.locator('input[type="checkbox"], button[role="switch"]').filter({ has: page.locator('text=/http.*3/i') }).first();
    this.forceHttpsToggle = page.locator('input[type="checkbox"], button[role="switch"]').filter({ has: page.locator('text=/force.*https|redirect/i') }).first();
    this.hstsToggle = page.locator('input[type="checkbox"], button[role="switch"]').filter({ has: page.locator('text=/hsts/i') }).first();
    this.certificateSelect = page.locator('select[name*="certificate"], [role="combobox"]').filter({ has: page.locator('option:has-text("certificate"), [role="option"]:has-text("certificate")') }).first();

    // Security tab fields
    this.wafEnabledToggle = page.locator('label').filter({ hasText: /WAF.*Firewall|ModSecurity/i }).locator('input[type="checkbox"]').first();
    this.wafModeSelect = page.locator('select[name*="waf_mode"], [role="combobox"]').filter({ has: page.locator('text=/detection|blocking/i') }).first();
    this.paranoiaLevelSelect = page.locator('select[name*="paranoia"], [role="combobox"]').filter({ has: page.locator('text=/paranoia|level/i') }).first();
    this.botFilterToggle = page.locator('label').filter({ hasText: /bot.*filter/i }).locator('input[type="checkbox"]').first();
    this.geoipToggle = page.locator('label').filter({ hasText: /geo.*ip|country/i }).locator('input[type="checkbox"]').first();

    // Save progress modal
    this.saveProgressModal = page.locator('[class*="progress"], [class*="saving"]').first();
    this.saveProgressSpinner = page.locator('.animate-spin');
    this.saveSuccessMessage = page.locator('text=/success|saved|created/i');
    this.saveErrorMessage = page.locator('text=/error|failed/i, .text-red-500, .text-red-600');
  }

  /**
   * Get the save/create button (scoped to modal).
   */
  get saveButton(): Locator {
    return this.page.locator('.fixed.inset-0 button[type="submit"]').first();
  }

  /**
   * Get the cancel button (scoped to modal).
   */
  get cancelButton(): Locator {
    return this.page.locator('.fixed.inset-0 button').filter({ hasText: /cancel/i }).first();
  }

  /**
   * Get the Next button (scoped to modal, for wizard navigation).
   */
  get nextButton(): Locator {
    return this.page.locator('.fixed.inset-0 button').filter({ hasText: /next/i }).first();
  }

  /**
   * Check if form modal is visible.
   */
  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Wait for form to be visible.
   */
  async waitForForm(): Promise<void> {
    await this.modal.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
  }

  /**
   * Switch to a specific tab. Uses force:true to handle sticky header interception.
   */
  async switchTab(tab: 'basic' | 'ssl' | 'security' | 'performance' | 'advanced' | 'protection'): Promise<void> {
    const tabMap = {
      basic: this.basicTab,
      ssl: this.sslTab,
      security: this.securityTab,
      performance: this.performanceTab,
      advanced: this.advancedTab,
      protection: this.protectionTab,
    };

    const tabButton = tabMap[tab];
    if (await tabButton.isVisible()) {
      await tabButton.click({ force: true });
      await this.page.waitForTimeout(300); // Tab transition
    }
  }

  /**
   * Fill domain name(s).
   */
  async fillDomain(domain: string): Promise<void> {
    const domainInput = this.page.locator('input[placeholder*="example.com"], input[placeholder*="domain"]').first();
    await domainInput.fill(domain);

    // Click add domain button or press Enter
    const addBtn = this.page.locator('button').filter({ hasText: /add.*domain/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      await domainInput.press('Enter');
    }
  }

  /**
   * Fill forward host (upstream server).
   */
  async fillForwardHost(host: string): Promise<void> {
    const hostInput = this.page.locator('input[placeholder*="192.168"], input[placeholder*="container_name"]').first();
    if (await hostInput.isVisible()) {
      await hostInput.fill(host);
    }
  }

  /**
   * Fill forward port.
   */
  async fillForwardPort(port: number): Promise<void> {
    const portInput = this.page.locator('input[placeholder="80"]').first();
    if (await portInput.isVisible()) {
      await portInput.clear();
      await portInput.fill(port.toString());
    } else {
      // Fallback: find by label
      const portLabel = this.page.locator('text=Forward Port').first();
      const container = portLabel.locator('..');
      const input = container.locator('input').first();
      if (await input.isVisible()) {
        await input.clear();
        await input.fill(port.toString());
      }
    }
  }

  /**
   * Select forward scheme (http/https).
   */
  async selectForwardScheme(scheme: 'http' | 'https'): Promise<void> {
    if (await this.forwardSchemeSelect.isVisible()) {
      await this.forwardSchemeSelect.selectOption(scheme);
    }
  }

  /**
   * Fill basic proxy host configuration.
   */
  async fillBasicConfig(config: {
    domain: string;
    forwardHost: string;
    forwardPort: number;
    forwardScheme?: 'http' | 'https';
  }): Promise<void> {
    await this.switchTab('basic');
    await this.fillDomain(config.domain);
    await this.fillForwardHost(config.forwardHost);
    await this.fillForwardPort(config.forwardPort);
    if (config.forwardScheme) {
      await this.selectForwardScheme(config.forwardScheme);
    }
  }

  /**
   * Enable/disable SSL.
   */
  async toggleSSL(enable: boolean): Promise<void> {
    await this.switchTab('ssl');
    const isEnabled = await this.isSSLEnabled();
    if (isEnabled !== enable) {
      // Use force:true to bypass overlay interception from modal content div
      await this.sslEnabledToggle.click({ force: true });
    }
  }

  /**
   * Check if SSL is enabled.
   */
  async isSSLEnabled(): Promise<boolean> {
    const toggle = this.sslEnabledToggle;
    if (await toggle.isVisible()) {
      // The SSL toggle is a custom button, not a checkbox.
      // When enabled, it has bg-green-500 class; when disabled, bg-slate-300.
      const className = await toggle.getAttribute('class') || '';
      return className.includes('bg-green');
    }
    return false;
  }

  /**
   * Enable/disable WAF.
   */
  async toggleWAF(enable: boolean): Promise<void> {
    await this.switchTab('security');
    const isEnabled = await this.isWAFEnabled();
    if (isEnabled !== enable) {
      await this.wafEnabledToggle.click();
    }
  }

  /**
   * Check if WAF is enabled.
   */
  async isWAFEnabled(): Promise<boolean> {
    const toggle = this.wafEnabledToggle;
    if (await toggle.isVisible()) {
      return await toggle.isChecked();
    }
    return false;
  }

  /**
   * Set WAF mode by clicking the appropriate radio label card.
   */
  async setWAFMode(mode: 'blocking' | 'detection'): Promise<void> {
    await this.switchTab('security');
    if (mode === 'blocking') {
      await this.page.locator('label').filter({ hasText: /blocking/i }).first().click();
    } else if (mode === 'detection') {
      await this.page.locator('label').filter({ hasText: /detection/i }).first().click();
    }
  }

  /**
   * Enable/disable bot filter.
   */
  async toggleBotFilter(enable: boolean): Promise<void> {
    await this.switchTab('security');
    const isEnabled = await this.botFilterToggle.isChecked().catch(() => false);
    if (isEnabled !== enable && await this.botFilterToggle.isVisible()) {
      await this.botFilterToggle.click();
    }
  }

  /**
   * Enable/disable GeoIP.
   */
  async toggleGeoIP(enable: boolean): Promise<void> {
    await this.switchTab('security');
    const isEnabled = await this.geoipToggle.isChecked().catch(() => false);
    if (isEnabled !== enable && await this.geoipToggle.isVisible()) {
      await this.geoipToggle.click();
    }
  }

  /**
   * Save the proxy host configuration.
   * In create mode, navigate to the last tab first (where the Create button appears).
   * In edit mode, the Save button is always visible.
   */
  async save(): Promise<void> {
    // If save/create button is not visible, we're in create mode on a non-last tab.
    // Click "Next" until we reach the last tab where "Create" appears.
    let attempts = 0;
    while (!(await this.saveButton.isVisible()) && attempts < 6) {
      const nextBtn = this.nextButton;
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await this.page.waitForTimeout(300);
      } else {
        break;
      }
      attempts++;
    }

    // Now click the save/create button
    await this.saveButton.click();

    // Wait for the form modal to close (happens after save progress completes)
    await this.modal.waitFor({ state: 'hidden', timeout: TIMEOUTS.long }).catch(() => null);
  }

  /**
   * Cancel and close the form.
   */
  async cancel(): Promise<void> {
    const cancelBtn = this.cancelButton;
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await this.closeButton.click();
    }
    await this.modal.waitFor({ state: 'hidden', timeout: TIMEOUTS.short });
  }

  /**
   * Check for validation errors.
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorMessages = this.page.locator('.text-red-500, .text-red-600, [class*="error"]');
    return await errorMessages.count() > 0;
  }

  /**
   * Get validation error messages.
   */
  async getValidationErrors(): Promise<string[]> {
    const errorMessages = this.page.locator('.text-red-500, .text-red-600, [class*="error"]');
    return await errorMessages.allTextContents();
  }

  /**
   * Verify form is displayed correctly.
   * Note: Save button may not be visible on the first tab in create mode.
   */
  async expectForm(): Promise<void> {
    await expect(this.modal).toBeVisible();
    // Either save button or next button should be visible
    const hasSave = await this.saveButton.isVisible();
    const hasNext = await this.nextButton.isVisible();
    expect(hasSave || hasNext).toBeTruthy();
  }

  /**
   * Verify form is closed.
   */
  async expectClosed(): Promise<void> {
    await expect(this.modal).not.toBeVisible();
  }
}
