import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CreateBotFilterRequest } from '../../types/security';
import { getBotFilter, updateBotFilter } from '../../api/security';
import type { SettingsTabProps } from './types';

export default function BotFilterSettings({ hostId, queryClient }: SettingsTabProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-filter', hostId],
    queryFn: () => getBotFilter(hostId),
    retry: false,
  });

  const [formData, setFormData] = useState<CreateBotFilterRequest>({
    enabled: false,
    block_bad_bots: true,
    block_ai_bots: false,
    allow_search_engines: true,
    custom_blocked_agents: '',
    custom_allowed_agents: '',
    challenge_suspicious: false,
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setFormData({
        enabled: data.enabled,
        block_bad_bots: data.block_bad_bots,
        block_ai_bots: data.block_ai_bots,
        allow_search_engines: data.allow_search_engines,
        custom_blocked_agents: data.custom_blocked_agents || '',
        custom_allowed_agents: data.custom_allowed_agents || '',
        challenge_suspicious: data.challenge_suspicious,
      });
      setInitialized(true);
    } else if (error && !initialized) {
      setInitialized(true);
    }
  }, [data, error, initialized]);

  const mutation = useMutation({
    mutationFn: (data: CreateBotFilterRequest) => updateBotFilter(hostId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-filter', hostId] });
      alert('Bot filter settings saved!');
    },
    onError: (err) => alert(`Error: ${err.message}`),
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">Bot Filter</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Block malicious bots and scrapers</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm font-medium">Enabled</span>
        </label>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.block_bad_bots}
            onChange={(e) => setFormData((prev) => ({ ...prev, block_bad_bots: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Block Bad Bots</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Block known malicious bots and scrapers</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.block_ai_bots}
            onChange={(e) => setFormData((prev) => ({ ...prev, block_ai_bots: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Block AI Bots</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Block AI crawlers (GPTBot, ChatGPT, Claude, etc.)</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allow_search_engines}
            onChange={(e) => setFormData((prev) => ({ ...prev, allow_search_engines: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Search Engines</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Allow Googlebot, Bingbot, etc.</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.challenge_suspicious}
            onChange={(e) => setFormData((prev) => ({ ...prev, challenge_suspicious: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Challenge Suspicious</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">Show CAPTCHA for suspicious requests</p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Custom Blocked User-Agents</label>
        <textarea
          value={formData.custom_blocked_agents}
          onChange={(e) => setFormData((prev) => ({ ...prev, custom_blocked_agents: e.target.value }))}
          placeholder="One per line"
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        />
      </div>

      <button
        onClick={() => mutation.mutate(formData)}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
