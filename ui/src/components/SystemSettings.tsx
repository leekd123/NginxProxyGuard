import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSystemSettings,
  updateSystemSettings,
  getGeoIPStatus,
  triggerGeoIPUpdate,
  testACME,
  getSystemLogConfig,
  updateSystemLogConfig,
} from '../api/settings';
import type { SystemSettings as SystemSettingsType, UpdateSystemSettingsRequest, SystemLogConfig } from '../types/settings';
import {
  GeoIPTab,
  ACMETab,
  BotFilterTab,
  SecurityTab,
  SystemLogsTab,
  MaintenanceTab,
  LogFilesTab,
} from './system-settings';

type TabType = 'geoip' | 'acme' | 'botfilter' | 'security' | 'maintenance' | 'logfiles' | 'systemlogs';

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('settings');
  const [activeTab, setActiveTab] = useState<TabType>('geoip');
  const [editedSettings, setEditedSettings] = useState<UpdateSystemSettingsRequest>({});
  const [editedLogConfig, setEditedLogConfig] = useState<Partial<SystemLogConfig>>({});
  const [excludePatternsText, setExcludePatternsText] = useState<string | null>(null);
  const [showLicenseKey, setShowLicenseKey] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: getSystemSettings,
  });

  const { data: geoipStatus, refetch: refetchGeoIP } = useQuery({
    queryKey: ['geoipStatus'],
    queryFn: getGeoIPStatus,
  });

  const updateMutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      queryClient.invalidateQueries({ queryKey: ['geoipStatus'] });
      setEditedSettings({});
    },
  });

  const geoipUpdateMutation = useMutation({
    mutationFn: () => triggerGeoIPUpdate(true),
    onSuccess: () => {
      setTimeout(() => refetchGeoIP(), 5000);
    },
  });

  const testACMEMutation = useMutation({
    mutationFn: testACME,
  });

  // System Log Config
  const { data: systemLogConfig } = useQuery({
    queryKey: ['systemLogConfig'],
    queryFn: getSystemLogConfig,
    enabled: activeTab === 'systemlogs',
  });

  const updateLogConfigMutation = useMutation({
    mutationFn: updateSystemLogConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemLogConfig'] });
      setEditedLogConfig({});
    },
  });
  const handleChange = (key: keyof UpdateSystemSettingsRequest, value: string | number | boolean | object) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(editedSettings).length > 0) {
      updateMutation.mutate(editedSettings);
    }
    if (Object.keys(editedLogConfig).length > 0 && systemLogConfig) {
      updateLogConfigMutation.mutate({
        ...systemLogConfig,
        ...editedLogConfig,
        levels: {
          ...systemLogConfig.levels,
          ...(editedLogConfig.levels || {}),
        }
      });
    }
  };

  const getValue = <K extends keyof SystemSettingsType>(key: K): SystemSettingsType[K] | undefined => {
    if (key in editedSettings) {
      return (editedSettings as Partial<SystemSettingsType>)[key] as SystemSettingsType[K];
    }
    return settings?.[key];
  };

  const getLogConfigValue = <K extends keyof SystemLogConfig>(key: K): SystemLogConfig[K] | undefined => {
    if (key === 'levels') {
      return undefined; // Handle levels separately
    }
    if (key in editedLogConfig) {
      return (editedLogConfig as Partial<SystemLogConfig>)[key] as SystemLogConfig[K];
    }
    return systemLogConfig?.[key];
  };

  const isModified = Object.keys(editedSettings).length > 0 || Object.keys(editedLogConfig).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'geoip', label: t('system.tabs.geoip'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'acme', label: t('system.tabs.acme'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { id: 'botfilter', label: t('system.tabs.botfilter'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    { id: 'security', label: t('system.tabs.security'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
    { id: 'maintenance', label: t('system.tabs.maintenance'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'logfiles', label: t('system.tabs.logfiles'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'systemlogs', label: t('system.tabs.systemlogs', 'System Logs'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
  ];

  // Common input class
  const inputClass = "mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{t('system.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('system.geoip.enable.description')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isModified || updateMutation.isPending}
          className="px-4 py-2 text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:bg-slate-300 transition-colors"
        >
          {updateMutation.isPending || updateLogConfigMutation.isPending ? t('system.buttons.saving') : t('system.buttons.save')}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 px-2">
          <div className="flex overflow-x-auto gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'geoip' && (
            <GeoIPTab
              settings={settings}
              editedSettings={editedSettings}
              geoipStatus={geoipStatus}
              showLicenseKey={showLicenseKey}
              setShowLicenseKey={setShowLicenseKey}
              geoipUpdateIsPending={geoipUpdateMutation.isPending}
              onGeoIPUpdate={() => geoipUpdateMutation.mutate()}
              getValue={getValue}
              handleChange={handleChange}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'acme' && (
            <ACMETab
              settings={settings}
              editedSettings={editedSettings}
              testACMEResult={testACMEMutation.data}
              testACMEIsPending={testACMEMutation.isPending}
              onTestACME={() => testACMEMutation.mutate()}
              getValue={getValue}
              handleChange={handleChange}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'botfilter' && (
            <BotFilterTab
              settings={settings}
              editedSettings={editedSettings}
              getValue={getValue}
              handleChange={handleChange}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              settings={settings}
              getValue={getValue}
              handleChange={handleChange}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'systemlogs' && (
            <SystemLogsTab
              systemLogConfig={systemLogConfig}
              editedLogConfig={editedLogConfig}
              setEditedLogConfig={setEditedLogConfig}
              excludePatternsText={excludePatternsText}
              setExcludePatternsText={setExcludePatternsText}
              getLogConfigValue={getLogConfigValue}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceTab
              settings={settings}
              editedSettings={editedSettings}
              getValue={getValue}
              handleChange={handleChange}
              inputClass={inputClass}
            />
          )}

          {activeTab === 'logfiles' && <LogFilesTab />}
        </div >
      </div >
    </div >
  );
}
