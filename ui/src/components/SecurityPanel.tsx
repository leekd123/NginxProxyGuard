import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RateLimitTab from './security-panel/RateLimitTab';
import Fail2banTab from './security-panel/Fail2banTab';
import BotFilterTab from './security-panel/BotFilterTab';
import SecurityHeadersTab from './security-panel/SecurityHeadersTab';
import BannedIPsTab from './security-panel/BannedIPsTab';

interface SecurityPanelProps {
  proxyHostId: string;
  onClose: () => void;
}

type ActiveTab = 'rate-limit' | 'fail2ban' | 'bot-filter' | 'headers' | 'banned-ips';

export default function SecurityPanel({ proxyHostId, onClose }: SecurityPanelProps) {
  const { t } = useTranslation('proxyHost');
  const [activeTab, setActiveTab] = useState<ActiveTab>('rate-limit');

  const tabs = [
    { id: 'rate-limit' as const, label: t('form.protection.rateLimit.title') },
    { id: 'fail2ban' as const, label: t('form.protection.fail2ban.title') },
    { id: 'bot-filter' as const, label: t('form.security.botFilter.title') },
    { id: 'headers' as const, label: t('form.protection.securityHeaders.title') },
    { id: 'banned-ips' as const, label: t('form.protection.bannedIPs.title') },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">{t('form.tabs.security')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b dark:border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'rate-limit' && <RateLimitTab proxyHostId={proxyHostId} />}
          {activeTab === 'fail2ban' && <Fail2banTab proxyHostId={proxyHostId} />}
          {activeTab === 'bot-filter' && <BotFilterTab proxyHostId={proxyHostId} />}
          {activeTab === 'headers' && <SecurityHeadersTab proxyHostId={proxyHostId} />}
          {activeTab === 'banned-ips' && <BannedIPsTab proxyHostId={proxyHostId} />}
        </div>
      </div>
    </div>
  );
}
