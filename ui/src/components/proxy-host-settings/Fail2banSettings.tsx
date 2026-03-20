import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CreateFail2banRequest } from '../../types/security';
import { getFail2ban, updateFail2ban } from '../../api/security';
import type { SettingsTabProps } from './types';

export default function Fail2banSettings({ hostId, queryClient }: SettingsTabProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fail2ban', hostId],
    queryFn: () => getFail2ban(hostId),
    retry: false,
  });

  const [formData, setFormData] = useState<CreateFail2banRequest>({
    enabled: false,
    max_retries: 5,
    find_time: 600,
    ban_time: 3600,
    fail_codes: '401,403,404',
    action: 'block',
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setFormData({
        enabled: data.enabled,
        max_retries: data.max_retries,
        find_time: data.find_time,
        ban_time: data.ban_time,
        fail_codes: data.fail_codes,
        action: data.action,
      });
      setInitialized(true);
    } else if (error && !initialized) {
      setInitialized(true);
    }
  }, [data, error, initialized]);

  const mutation = useMutation({
    mutationFn: (data: CreateFail2banRequest) => updateFail2ban(hostId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fail2ban', hostId] });
      alert('Fail2ban settings saved!');
    },
    onError: (err) => alert(`Error: ${err.message}`),
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">Fail2ban</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Auto-ban IPs after repeated failures</p>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Retries</label>
          <input
            type="number"
            value={formData.max_retries}
            onChange={(e) => setFormData((prev) => ({ ...prev, max_retries: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Failures before ban</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Find Time (seconds)</label>
          <input
            type="number"
            value={formData.find_time}
            onChange={(e) => setFormData((prev) => ({ ...prev, find_time: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Time window for counting failures</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ban Time (seconds)</label>
          <input
            type="number"
            value={formData.ban_time}
            onChange={(e) => setFormData((prev) => ({ ...prev, ban_time: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Duration of ban (3600 = 1 hour)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Action</label>
          <select
            value={formData.action}
            onChange={(e) => setFormData((prev) => ({ ...prev, action: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="block">Block</option>
            <option value="log">Log Only</option>
            <option value="notify">Notify</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Failure Status Codes (comma separated)</label>
        <input
          type="text"
          value={formData.fail_codes}
          onChange={(e) => setFormData((prev) => ({ ...prev, fail_codes: e.target.value }))}
          placeholder="401,403,404"
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
