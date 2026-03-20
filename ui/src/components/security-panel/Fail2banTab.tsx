import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getFail2ban, updateFail2ban } from '../../api/security';
import type { CreateFail2banRequest } from '../../types/security';
import type { SecurityTabProps } from './types';

export default function Fail2banTab({ proxyHostId }: SecurityTabProps) {
  const { t } = useTranslation('proxyHost');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['fail2ban', proxyHostId],
    queryFn: () => getFail2ban(proxyHostId),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateFail2banRequest) => updateFail2ban(proxyHostId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fail2ban', proxyHostId] }),
  });

  const [form, setForm] = useState({
    enabled: false,
    max_retries: 5,
    find_time: 600,
    ban_time: 3600,
    fail_codes: '401,403,404',
    action: 'block',
  });

  if (data && !form.enabled && data.enabled) {
    setForm({
      enabled: data.enabled,
      max_retries: data.max_retries,
      find_time: data.find_time,
      ban_time: data.ban_time,
      fail_codes: data.fail_codes,
      action: data.action,
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) return <div className="text-center py-4">{t('common:status.loading')}</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="font-medium">{t('form.protection.fail2ban.enabled')}</span>
      </label>

      {form.enabled && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.protection.fail2ban.maxRetries')}</label>
              <input
                type="number"
                value={form.max_retries}
                onChange={(e) => setForm({ ...form, max_retries: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.protection.fail2ban.findTime')}</label>
              <input
                type="number"
                value={form.find_time}
                onChange={(e) => setForm({ ...form, find_time: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min={60}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.protection.fail2ban.banTime')}</label>
              <input
                type="number"
                value={form.ban_time}
                onChange={(e) => setForm({ ...form, ban_time: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min={0}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">0 = permanent</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fail Codes (comma-separated)
              </label>
              <input
                type="text"
                value={form.fail_codes}
                onChange={(e) => setForm({ ...form, fail_codes: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="401,403,404"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="block">Block IP</option>
                <option value="log">Log Only</option>
                <option value="notify">Notify Only</option>
              </select>
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
