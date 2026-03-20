import { useTranslation } from 'react-i18next';
import { SettingField, CheckboxField, inputClass } from './SettingFields';
import type { TabContentProps } from './types';

export default function CompressionTab({ getNumberValue, getStringValue, getBoolValue, handleChange }: TabContentProps) {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-8">
      {/* Gzip Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">Gzip</span>
          {t('global.fields.gzip_enabled.label')}
        </h3>
        <CheckboxField
          settingKey="gzip_enabled"
          checked={getBoolValue('gzip_enabled')}
          onChange={(checked) => handleChange('gzip_enabled', checked)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <SettingField settingKey="gzip_comp_level">
            <input
              type="number"
              min="1"
              max="9"
              value={getNumberValue('gzip_comp_level', 6)}
              onChange={(e) => handleChange('gzip_comp_level', parseInt(e.target.value))}
              className={inputClass}
            />
          </SettingField>
          <SettingField settingKey="gzip_min_length">
            <input
              type="number"
              value={getNumberValue('gzip_min_length', 256)}
              onChange={(e) => handleChange('gzip_min_length', parseInt(e.target.value))}
              className={inputClass}
            />
          </SettingField>
        </div>
        <div className="mt-4">
          <SettingField settingKey="gzip_types">
            <textarea
              value={getStringValue('gzip_types', '')}
              onChange={(e) => handleChange('gzip_types', e.target.value)}
              rows={2}
              className={`${inputClass} font-mono`}
            />
          </SettingField>
        </div>
        <div className="mt-4">
          <CheckboxField
            settingKey="gzip_vary"
            checked={getBoolValue('gzip_vary')}
            onChange={(checked) => handleChange('gzip_vary', checked)}
          />
        </div>
      </div>

      {/* Brotli Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">Brotli</span>
          {t('global.fields.brotli_enabled.label')}
        </h3>
        <CheckboxField
          settingKey="brotli_enabled"
          checked={getBoolValue('brotli_enabled')}
          onChange={(checked) => handleChange('brotli_enabled', checked)}
        />
        <CheckboxField
          settingKey="brotli_static"
          checked={getBoolValue('brotli_static')}
          onChange={(checked) => handleChange('brotli_static', checked)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <SettingField settingKey="brotli_comp_level">
            <input
              type="number"
              min="1"
              max="11"
              value={getNumberValue('brotli_comp_level', 6)}
              onChange={(e) => handleChange('brotli_comp_level', parseInt(e.target.value))}
              className={inputClass}
            />
          </SettingField>
          <SettingField settingKey="brotli_min_length">
            <input
              type="number"
              min="0"
              value={getNumberValue('brotli_min_length', 1000)}
              onChange={(e) => handleChange('brotli_min_length', parseInt(e.target.value))}
              className={inputClass}
            />
          </SettingField>
        </div>
        <div className="mt-4">
          <SettingField settingKey="brotli_types">
            <textarea
              value={getStringValue('brotli_types', '')}
              onChange={(e) => handleChange('brotli_types', e.target.value)}
              rows={2}
              className={`${inputClass} font-mono`}
            />
          </SettingField>
        </div>
      </div>

      {/* Compression Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
        {t('global.tips.compression')}
      </div>
    </div>
  );
}
