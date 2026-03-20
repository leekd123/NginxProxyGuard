import { SettingField, inputClass } from './SettingFields';
import type { TabContentProps } from './types';

export default function TimeoutTab({ getNumberValue, handleChange }: TabContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SettingField settingKey="client_body_timeout">
          <input
            type="number"
            value={getNumberValue('client_body_timeout', 60)}
            onChange={(e) => handleChange('client_body_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="client_header_timeout">
          <input
            type="number"
            value={getNumberValue('client_header_timeout', 60)}
            onChange={(e) => handleChange('client_header_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="send_timeout">
          <input
            type="number"
            value={getNumberValue('send_timeout', 60)}
            onChange={(e) => handleChange('send_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-700 pt-6">
        <SettingField settingKey="proxy_connect_timeout">
          <input
            type="number"
            value={getNumberValue('proxy_connect_timeout', 60)}
            onChange={(e) => handleChange('proxy_connect_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="proxy_send_timeout">
          <input
            type="number"
            value={getNumberValue('proxy_send_timeout', 60)}
            onChange={(e) => handleChange('proxy_send_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="proxy_read_timeout">
          <input
            type="number"
            value={getNumberValue('proxy_read_timeout', 60)}
            onChange={(e) => handleChange('proxy_read_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
      </div>
    </div>
  );
}
