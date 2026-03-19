import { useTranslation } from 'react-i18next';
import type { SystemSettings, UpdateSystemSettingsRequest } from '../../types/settings';
import { HelpTip } from '../common/HelpTip';

interface GeoIPStatus {
  status: string;
  last_updated?: string;
  error_message?: string;
  country_db: boolean;
  asn_db: boolean;
}

interface GeoIPTabProps {
  settings: SystemSettings | undefined;
  editedSettings: UpdateSystemSettingsRequest;
  geoipStatus: GeoIPStatus | undefined;
  showLicenseKey: boolean;
  setShowLicenseKey: (v: boolean) => void;
  geoipUpdateIsPending: boolean;
  onGeoIPUpdate: () => void;
  getValue: <K extends keyof SystemSettings>(key: K) => SystemSettings[K] | undefined;
  handleChange: (key: keyof UpdateSystemSettingsRequest, value: string | number | boolean | object) => void;
  inputClass: string;
}

export function GeoIPTab({
  settings,
  editedSettings,
  geoipStatus,
  showLicenseKey,
  setShowLicenseKey,
  geoipUpdateIsPending,
  onGeoIPUpdate,
  getValue,
  handleChange,
  inputClass,
}: GeoIPTabProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`p-5 rounded-xl ${geoipStatus?.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30' :
        geoipStatus?.status === 'error' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30' :
          'bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">{t('system.geoip.status.title')}</h3>
            <p className="text-sm mt-1.5">
              {geoipStatus?.status === 'active' && (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {t('system.geoip.status.active')}
                  {geoipStatus.last_updated && t('system.geoip.status.lastUpdated', { date: new Date(geoipStatus.last_updated).toLocaleDateString() })}
                </span>
              )}
              {geoipStatus?.status === 'inactive' && (
                <span className="text-slate-600 dark:text-slate-400">{t('system.geoip.status.inactive')}</span>
              )}
              {geoipStatus?.status === 'error' && (
                <span className="text-red-700 dark:text-red-400">{geoipStatus.error_message || t('system.geoip.status.error')}</span>
              )}
              {geoipStatus?.status === 'updating' && (
                <span className="text-blue-700 dark:text-blue-400">{t('system.geoip.status.updating')}</span>
              )}
            </p>
          </div>
          <button
            onClick={onGeoIPUpdate}
            disabled={geoipUpdateIsPending || !settings?.maxmind_license_key}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
          >
            {geoipUpdateIsPending ? t('system.buttons.updating') : t('system.buttons.updateNow')}
          </button>
        </div>
        {geoipStatus && (
          <div className="mt-4 flex gap-4 text-sm">
            <span className={`flex items-center gap-1.5 ${geoipStatus.country_db ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {geoipStatus.country_db ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
              </svg>
              {t('system.geoip.status.countryDb')}
            </span>
            <span className={`flex items-center gap-1.5 ${geoipStatus.asn_db ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {geoipStatus.asn_db ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
              </svg>
              {t('system.geoip.status.asnDb')}
            </span>
          </div>
        )}
      </div>

      {/* Enable/Disable */}
      <div className="py-3 px-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={getValue('geoip_enabled') ?? false}
            onChange={(e) => handleChange('geoip_enabled', e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-600"
          />
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              {t('system.geoip.enable.label')}
              <HelpTip contentKey="help.geoip.enable" ns="settings" />
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('system.geoip.enable.description')}
            </p>
          </div>
        </label>
      </div>

      {/* MaxMind Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {t('system.geoip.account.idLabel')}
            <HelpTip contentKey="help.geoip.account" ns="settings" />
          </label>
          <input
            type="text"
            value={(editedSettings.maxmind_account_id ?? settings?.maxmind_account_id) || ''}
            onChange={(e) => handleChange('maxmind_account_id', e.target.value)}
            className={inputClass}
            placeholder={t('system.geoip.account.idPlaceholder')}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <a href="https://www.maxmind.com/en/geolite2/signup" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium">
              {t('system.geoip.account.createAccount')}
            </a>
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.geoip.account.keyLabel')}</label>
          <div className="relative mt-1">
            <input
              type={showLicenseKey ? 'text' : 'password'}
              value={(editedSettings.maxmind_license_key ?? settings?.maxmind_license_key) || ''}
              onChange={(e) => handleChange('maxmind_license_key', e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-20"
              placeholder={t('system.geoip.account.keyPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowLicenseKey(!showLicenseKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded transition-colors"
            >
              {showLicenseKey ? t('system.buttons.hide') : t('system.buttons.view')}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('system.geoip.account.keyHelp')}
          </p>
        </div>
      </div>

      {/* Auto Update */}
      <div className="space-y-5 border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('system.geoip.autoUpdate.title')}
        </h3>

        <div className="py-3 px-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={getValue('geoip_auto_update') ?? true}
              onChange={(e) => handleChange('geoip_auto_update', e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-600"
            />
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('system.geoip.autoUpdate.enableLabel')}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('system.geoip.autoUpdate.enableDescription')}
              </p>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.geoip.autoUpdate.intervalLabel')}</label>
          <select
            value={(editedSettings.geoip_update_interval ?? settings?.geoip_update_interval) || '7d'}
            onChange={(e) => handleChange('geoip_update_interval', e.target.value)}
            className={`${inputClass} md:w-48`}
          >
            <option value="1d">{t('system.geoip.autoUpdate.intervals.daily')}</option>
            <option value="7d">{t('system.geoip.autoUpdate.intervals.weekly')}</option>
            <option value="30d">{t('system.geoip.autoUpdate.intervals.monthly')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
