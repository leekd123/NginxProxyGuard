import { useTranslation } from 'react-i18next';
import type { SystemLogConfig } from '../../types/settings';

interface SystemLogsTabProps {
  systemLogConfig: SystemLogConfig | undefined;
  editedLogConfig: Partial<SystemLogConfig>;
  setEditedLogConfig: React.Dispatch<React.SetStateAction<Partial<SystemLogConfig>>>;
  excludePatternsText: string | null;
  setExcludePatternsText: (v: string | null) => void;
  getLogConfigValue: <K extends keyof SystemLogConfig>(key: K) => SystemLogConfig[K] | undefined;
  inputClass: string;
}

export function SystemLogsTab({
  systemLogConfig,
  editedLogConfig,
  setEditedLogConfig,
  excludePatternsText,
  setExcludePatternsText,
  getLogConfigValue,
  inputClass,
}: SystemLogsTabProps) {
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
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {t('system.systemlogs.title', 'System Log Collection')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('system.systemlogs.description', 'Configure which logs are collected from the system containers. Reducing log level can improve performance.')}
            </p>
          </div>
        </div>
      </div>

      {/* Enable/Disable */}
      <div className="py-3 px-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={getLogConfigValue('enabled') ?? true}
            onChange={(e) => setEditedLogConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-600"
          />
          <div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('system.systemlogs.enable.label', 'Enable System Log Collection')}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('system.systemlogs.enable.description', 'Collect logs from docker containers')}
            </p>
          </div>
        </label>
      </div>

      {/* Container Levels */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
          {t('system.systemlogs.levels.title', 'Container Log Levels')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['npg-proxy', 'npg-api', 'npg-db', 'npg-ui'].map((container) => {
            const currentLevel = (editedLogConfig.levels?.[container]) || (systemLogConfig?.levels?.[container]) || 'info';
            return (
              <div key={container} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {container}
                </label>
                <select
                  value={currentLevel}
                  onChange={(e) => {
                    const newLevels = {
                      ...(systemLogConfig?.levels || {}),
                      ...(editedLogConfig.levels || {}),
                      [container]: e.target.value
                    };
                    setEditedLogConfig(prev => ({ ...prev, levels: newLevels }));
                  }}
                  className={inputClass}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="fatal">Fatal</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclude Patterns */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('system.systemlogs.exclude.label', 'Exclude Patterns')}
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('system.systemlogs.exclude.count', { count: (getLogConfigValue('exclude_patterns') || []).length })}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {t('system.systemlogs.exclude.description', 'Log messages matching these patterns (regex) will be ignored. One pattern per line.')}
        </p>
        <textarea
          value={excludePatternsText !== null
            ? excludePatternsText
            : (editedLogConfig.exclude_patterns !== undefined
              ? editedLogConfig.exclude_patterns
              : systemLogConfig?.exclude_patterns || []
            ).join('\n')}
          onChange={(e) => setExcludePatternsText(e.target.value)}
          onBlur={(e) => {
            const patterns = e.target.value.split('\n').filter(s => s.trim())
            setEditedLogConfig(prev => ({ ...prev, exclude_patterns: patterns }))
            setExcludePatternsText(null)
          }}
          className={`${inputClass} font-mono text-xs`}
          rows={6}
          placeholder="^/health
HEAD /"
        />
      </div>
    </div>
  );
}
