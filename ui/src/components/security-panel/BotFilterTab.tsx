import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getBotFilter, updateBotFilter, getKnownBots } from '../../api/security';
import type { CreateBotFilterRequest } from '../../types/security';
import type { SecurityTabProps } from './types';

export default function BotFilterTab({ proxyHostId }: SecurityTabProps) {
  const { t } = useTranslation('proxyHost');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['bot-filter', proxyHostId],
    queryFn: () => getBotFilter(proxyHostId),
  });

  const { data: knownBots } = useQuery({
    queryKey: ['known-bots'],
    queryFn: getKnownBots,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateBotFilterRequest) => updateBotFilter(proxyHostId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-filter', proxyHostId] }),
  });

  const [form, setForm] = useState({
    enabled: false,
    block_bad_bots: true,
    block_ai_bots: false,
    allow_search_engines: true,
    custom_blocked_agents: '',
    custom_allowed_agents: '',
    challenge_suspicious: false,
  });

  if (data && !form.enabled && data.enabled) {
    setForm({
      enabled: data.enabled,
      block_bad_bots: data.block_bad_bots,
      block_ai_bots: data.block_ai_bots,
      allow_search_engines: data.allow_search_engines,
      custom_blocked_agents: data.custom_blocked_agents || '',
      custom_allowed_agents: data.custom_allowed_agents || '',
      challenge_suspicious: data.challenge_suspicious,
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
        <span className="font-medium">{t('form.security.botFilter.enabled')}</span>
      </label>

      {form.enabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.block_bad_bots}
                onChange={(e) => setForm({ ...form, block_bad_bots: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.security.botFilter.blockBadBots')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.block_ai_bots}
                onChange={(e) => setForm({ ...form, block_ai_bots: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.security.botFilter.blockAiBots')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.allow_search_engines}
                onChange={(e) => setForm({ ...form, allow_search_engines: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.security.botFilter.allowSearchEngines')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.challenge_suspicious}
                onChange={(e) => setForm({ ...form, challenge_suspicious: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.security.botFilter.challengeSuspicious')}</span>
            </label>
          </div>

          {knownBots && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md text-xs">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Bad Bots ({knownBots.bad_bots.length})</p>
                <p className="text-gray-500 dark:text-gray-400 truncate">{knownBots.bad_bots.slice(0, 5).join(', ')}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">AI Bots ({knownBots.ai_bots.length})</p>
                <p className="text-gray-500 dark:text-gray-400 truncate">{knownBots.ai_bots.slice(0, 5).join(', ')}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Search Engines ({knownBots.search_engine_bots.length})</p>
                <p className="text-gray-500 dark:text-gray-400 truncate">{knownBots.search_engine_bots.slice(0, 5).join(', ')}...</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Blocked User-Agents (one per line)
            </label>
            <textarea
              value={form.custom_blocked_agents}
              onChange={(e) => setForm({ ...form, custom_blocked_agents: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
              placeholder="BadBot&#10;MaliciousCrawler"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Allowed User-Agents (one per line)
            </label>
            <textarea
              value={form.custom_allowed_agents}
              onChange={(e) => setForm({ ...form, custom_allowed_agents: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
              placeholder="MyInternalBot&#10;MonitoringService"
            />
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
