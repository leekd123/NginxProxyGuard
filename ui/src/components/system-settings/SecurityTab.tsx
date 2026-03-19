import { useTranslation } from 'react-i18next';
import type { SystemSettings, UpdateSystemSettingsRequest } from '../../types/settings';
import { HelpTip } from '../common/HelpTip';

interface SecurityTabProps {
  settings: SystemSettings | undefined;
  getValue: <K extends keyof SystemSettings>(key: K) => SystemSettings[K] | undefined;
  handleChange: (key: keyof UpdateSystemSettingsRequest, value: string | number | boolean | object) => void;
  inputClass: string;
}

export function SecurityTab({
  settings,
  getValue,
  handleChange,
  inputClass,
}: SecurityTabProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-xl border ${settings?.waf_auto_ban_enabled
        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30'
        : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">{t('system.waf.status.title')}</h3>
            <p className="text-sm mt-1.5">
              {settings?.waf_auto_ban_enabled ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {t('system.waf.status.activeDescription')}
                </span>
              ) : (
                <span className="text-slate-600 dark:text-slate-400">
                  {t('system.waf.status.inactiveDescription')}
                </span>
              )}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${settings?.waf_auto_ban_enabled
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
            }`}>
            {settings?.waf_auto_ban_enabled ? t('system.waf.status.active') : t('system.waf.status.inactive')}
          </div>
        </div>
      </div>

      <div className="py-3 px-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={getValue('waf_auto_ban_enabled') ?? false}
            onChange={(e) => handleChange('waf_auto_ban_enabled', e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-600"
          />
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              {t('system.waf.enable.label')}
              <HelpTip contentKey="help.waf.autoBan" ns="settings" />
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('system.waf.enable.description')}
            </p>
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">{t('system.waf.config.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.waf.config.threshold.label')}</label>
            <input
              type="number"
              value={getValue('waf_auto_ban_threshold') ?? 10}
              onChange={(e) => handleChange('waf_auto_ban_threshold', parseInt(e.target.value))}
              className={inputClass}
              min="1"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('system.waf.config.threshold.description')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.waf.config.window.label')}</label>
            <input
              type="number"
              value={getValue('waf_auto_ban_window') ?? 300}
              onChange={(e) => handleChange('waf_auto_ban_window', parseInt(e.target.value))}
              className={inputClass}
              min="30"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('system.waf.config.window.description')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.waf.config.duration.label')}</label>
            <input
              type="number"
              value={getValue('waf_auto_ban_duration') ?? 3600}
              onChange={(e) => handleChange('waf_auto_ban_duration', parseInt(e.target.value))}
              className={inputClass}
              min="0"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('system.waf.config.duration.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('system.waf.info.title')}</h4>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          {t('system.waf.info.description')}
        </p>
      </div>
    </div>
  );
}
