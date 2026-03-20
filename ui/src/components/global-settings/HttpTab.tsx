import { SettingField, CheckboxField, inputClass } from './SettingFields';
import type { TabContentProps } from './types';

export default function HttpTab({ getNumberValue, getStringValue, getBoolValue, handleChange }: TabContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingField settingKey="keepalive_timeout">
          <input
            type="number"
            value={getNumberValue('keepalive_timeout', 65)}
            onChange={(e) => handleChange('keepalive_timeout', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="keepalive_requests">
          <input
            type="number"
            value={getNumberValue('keepalive_requests', 100)}
            onChange={(e) => handleChange('keepalive_requests', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="client_max_body_size">
          <input
            type="text"
            value={getStringValue('client_max_body_size', '100m')}
            onChange={(e) => handleChange('client_max_body_size', e.target.value)}
            className={inputClass}
          />
        </SettingField>
        <SettingField settingKey="types_hash_max_size">
          <input
            type="number"
            value={getNumberValue('types_hash_max_size', 2048)}
            onChange={(e) => handleChange('types_hash_max_size', parseInt(e.target.value))}
            className={inputClass}
          />
        </SettingField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-6">
        <CheckboxField
          settingKey="sendfile"
          checked={getBoolValue('sendfile')}
          onChange={(checked) => handleChange('sendfile', checked)}
        />
        <CheckboxField
          settingKey="tcp_nopush"
          checked={getBoolValue('tcp_nopush')}
          onChange={(checked) => handleChange('tcp_nopush', checked)}
        />
        <CheckboxField
          settingKey="tcp_nodelay"
          checked={getBoolValue('tcp_nodelay')}
          onChange={(checked) => handleChange('tcp_nodelay', checked)}
        />
        <CheckboxField
          settingKey="server_tokens"
          checked={getBoolValue('server_tokens')}
          onChange={(checked) => handleChange('server_tokens', checked)}
        />
      </div>
    </div>
  );
}
