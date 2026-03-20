import { useTranslation } from 'react-i18next';
import { HelpTip } from '../common/HelpTip';

// Common input class
export const inputClass = "mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

export function SettingField({
  settingKey,
  children,
  className = '',
}: {
  settingKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation('settings');
  return (
    <div className={`${className} group`}>
      <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
        {t(`global.fields.${settingKey}.label`)}
        <HelpTip contentKey={`help.global.${settingKey}`} ns="settings" />
      </label>
      {children}
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(`global.fields.${settingKey}.description`)}</p>
    </div>
  );
}

export function CheckboxField({
  settingKey,
  checked,
  onChange,
}: {
  settingKey: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <div className="py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-white dark:bg-slate-700"
        />
        <div className="flex-1">
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {t(`global.fields.${settingKey}.label`)}
            <HelpTip contentKey={`help.global.${settingKey}`} ns="settings" />
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t(`global.fields.${settingKey}.description`)}</p>
        </div>
      </label>
    </div>
  );
}
