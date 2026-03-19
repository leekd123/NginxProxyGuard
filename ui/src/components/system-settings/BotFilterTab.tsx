import { useTranslation } from 'react-i18next';
import type { SystemSettings, UpdateSystemSettingsRequest } from '../../types/settings';
import { HelpTip } from '../common/HelpTip';

interface BotFilterTabProps {
  settings: SystemSettings | undefined;
  editedSettings: UpdateSystemSettingsRequest;
  getValue: <K extends keyof SystemSettings>(key: K) => SystemSettings[K] | undefined;
  handleChange: (key: keyof UpdateSystemSettingsRequest, value: string | number | boolean | object) => void;
  inputClass: string;
}

export function BotFilterTab({
  settings,
  editedSettings,
  getValue,
  handleChange,
  inputClass,
}: BotFilterTabProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="flex gap-4">
          <div className="text-blue-600 dark:text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              {t('system.botfilter.defaults.title')}
              <HelpTip contentKey="help.botFilter.defaults" ns="settings" />
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('system.botfilter.defaults.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Default Enable */}
      <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <input
          type="checkbox"
          checked={getValue('bot_filter_default_enabled') ?? false}
          onChange={(e) => handleChange('bot_filter_default_enabled', e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
        />
        <div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('system.botfilter.enableDefault.label')}</span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('system.botfilter.enableDefault.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">{t('system.botfilter.options.title')}</h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={getValue('bot_filter_default_block_bad_bots') ?? true}
                onChange={(e) => handleChange('bot_filter_default_block_bad_bots', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{t('system.botfilter.options.blockBadBots.label')}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('system.botfilter.options.blockBadBots.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={getValue('bot_filter_default_block_ai_bots') ?? false}
                onChange={(e) => handleChange('bot_filter_default_block_ai_bots', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{t('system.botfilter.options.blockAiBots.label')}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('system.botfilter.options.blockAiBots.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={getValue('bot_filter_default_allow_search_engines') ?? true}
                onChange={(e) => handleChange('bot_filter_default_allow_search_engines', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{t('system.botfilter.options.allowSearchEngines.label')}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('system.botfilter.options.allowSearchEngines.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={getValue('bot_filter_default_challenge_suspicious') ?? false}
                onChange={(e) => handleChange('bot_filter_default_challenge_suspicious', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-700"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{t('system.botfilter.options.challengeSuspicious.label')}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('system.botfilter.options.challengeSuspicious.description')}</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('system.botfilter.customAgents.label')}</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('system.botfilter.customAgents.description')}</p>
            <textarea
              value={(editedSettings.bot_filter_default_custom_blocked_agents ?? settings?.bot_filter_default_custom_blocked_agents) || ''}
              onChange={(e) => handleChange('bot_filter_default_custom_blocked_agents', e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              rows={5}
              placeholder={t('system.botfilter.customAgents.placeholder')}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('system.botfilter.lists.title')}</h3>
              <HelpTip contentKey="help.botFilter.lists" ns="settings" />
              <span className="px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">{t('system.botfilter.lists.badge')}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('system.botfilter.lists.description')}
          </p>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('system.botfilter.lists.badBots.label')}</label>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('system.botfilter.lists.patternCount', { count: (editedSettings.bot_list_bad_bots ?? settings?.bot_list_bad_bots)?.split('\n').filter((l: string) => l.trim()).length || 0 })}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('system.botfilter.lists.badBots.description')}</p>
            <textarea
              value={(editedSettings.bot_list_bad_bots ?? settings?.bot_list_bad_bots) || ''}
              onChange={(e) => handleChange('bot_list_bad_bots', e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              rows={4}
              placeholder={t('system.botfilter.lists.badBots.placeholder')}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('system.botfilter.lists.aiBots.label')}</label>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('system.botfilter.lists.patternCount', { count: (editedSettings.bot_list_ai_bots ?? settings?.bot_list_ai_bots)?.split('\n').filter((l: string) => l.trim()).length || 0 })}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('system.botfilter.lists.aiBots.description')}</p>
            <textarea
              value={(editedSettings.bot_list_ai_bots ?? settings?.bot_list_ai_bots) || ''}
              onChange={(e) => handleChange('bot_list_ai_bots', e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              rows={4}
              placeholder={t('system.botfilter.lists.aiBots.placeholder')}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('system.botfilter.lists.searchEngines.label')}</label>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('system.botfilter.lists.patternCount', { count: (editedSettings.bot_list_search_engines ?? settings?.bot_list_search_engines)?.split('\n').filter((l: string) => l.trim()).length || 0 })}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('system.botfilter.lists.searchEngines.description')}</p>
            <textarea
              value={(editedSettings.bot_list_search_engines ?? settings?.bot_list_search_engines) || ''}
              onChange={(e) => handleChange('bot_list_search_engines', e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              rows={4}
              placeholder={t('system.botfilter.lists.searchEngines.placeholder')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">{t('system.botfilter.summary.title')}</h3>
        <div className="flex gap-4">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${(getValue('bot_filter_default_enabled') ?? false) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
            Bot Filter: {(getValue('bot_filter_default_enabled') ?? false) ? t('system.botfilter.summary.active') : t('system.botfilter.summary.inactive')}
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
            {t('system.botfilter.summary.blocked')}: {
              [
                (getValue('bot_filter_default_block_bad_bots') ?? true) && t('system.botfilter.options.blockBadBots.label'),
                (getValue('bot_filter_default_block_ai_bots') ?? false) && t('system.botfilter.options.blockAiBots.label')
              ].filter(Boolean).join(', ') || '-'
            }
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400">
            {t('system.botfilter.summary.allowed')}: {(getValue('bot_filter_default_allow_search_engines') ?? true) ? t('system.botfilter.options.allowSearchEngines.label') : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
