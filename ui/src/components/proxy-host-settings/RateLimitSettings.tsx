import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CreateRateLimitRequest } from '../../types/security';
import { getRateLimit, updateRateLimit } from '../../api/security';
import type { SettingsTabProps } from './types';

export default function RateLimitSettings({ hostId, queryClient }: SettingsTabProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rate-limit', hostId],
    queryFn: () => getRateLimit(hostId),
    retry: false,
  });

  const [formData, setFormData] = useState<CreateRateLimitRequest>({
    enabled: false,
    requests_per_second: 10,
    burst_size: 20,
    zone_size: '10m',
    limit_by: 'ip',
    limit_response: 429,
    whitelist_ips: '',
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setFormData({
        enabled: data.enabled,
        requests_per_second: data.requests_per_second,
        burst_size: data.burst_size,
        zone_size: data.zone_size,
        limit_by: data.limit_by,
        limit_response: data.limit_response,
        whitelist_ips: data.whitelist_ips || '',
      });
      setInitialized(true);
    } else if (error && !initialized) {
      setInitialized(true);
    }
  }, [data, error, initialized]);

  const mutation = useMutation({
    mutationFn: (data: CreateRateLimitRequest) => updateRateLimit(hostId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit', hostId] });
      alert('Rate limit settings saved!');
    },
    onError: (err) => alert(`Error: ${err.message}`),
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">Rate Limiting</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Limit requests per second to prevent abuse</p>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Requests per Second</label>
          <input
            type="number"
            value={formData.requests_per_second}
            onChange={(e) => setFormData((prev) => ({ ...prev, requests_per_second: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Burst Size</label>
          <input
            type="number"
            value={formData.burst_size}
            onChange={(e) => setFormData((prev) => ({ ...prev, burst_size: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limit By</label>
          <select
            value={formData.limit_by}
            onChange={(e) => setFormData((prev) => ({ ...prev, limit_by: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400"
          >
            <option value="ip">IP Address</option>
            <option value="uri">URI</option>
            <option value="ip_uri">IP + URI</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Response Code</label>
          <select
            value={formData.limit_response}
            onChange={(e) => setFormData((prev) => ({ ...prev, limit_response: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400"
          >
            <option value={429}>429 Too Many Requests</option>
            <option value={503}>503 Service Unavailable</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Whitelist IPs (comma separated)</label>
        <input
          type="text"
          value={formData.whitelist_ips}
          onChange={(e) => setFormData((prev) => ({ ...prev, whitelist_ips: e.target.value }))}
          placeholder="192.168.1.1, 10.0.0.0/8"
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400"
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
