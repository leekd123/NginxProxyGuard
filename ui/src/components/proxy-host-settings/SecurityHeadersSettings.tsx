import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CreateSecurityHeadersRequest } from '../../types/security';
import { getSecurityHeaders, updateSecurityHeaders } from '../../api/security';
import type { SettingsTabProps } from './types';

export default function SecurityHeadersSettings({ hostId, queryClient }: SettingsTabProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['security-headers', hostId],
    queryFn: () => getSecurityHeaders(hostId),
    retry: false,
  });

  const [formData, setFormData] = useState<CreateSecurityHeadersRequest>({
    enabled: false,
    hsts_enabled: true,
    hsts_max_age: 31536000,
    hsts_include_subdomains: true,
    hsts_preload: false,
    x_frame_options: 'SAMEORIGIN',
    x_content_type_options: true,
    x_xss_protection: true,
    referrer_policy: 'strict-origin-when-cross-origin',
    content_security_policy: '',
    permissions_policy: '',
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setFormData({
        enabled: data.enabled,
        hsts_enabled: data.hsts_enabled,
        hsts_max_age: data.hsts_max_age,
        hsts_include_subdomains: data.hsts_include_subdomains,
        hsts_preload: data.hsts_preload,
        x_frame_options: data.x_frame_options,
        x_content_type_options: data.x_content_type_options,
        x_xss_protection: data.x_xss_protection,
        referrer_policy: data.referrer_policy,
        content_security_policy: data.content_security_policy || '',
        permissions_policy: data.permissions_policy || '',
      });
      setInitialized(true);
    } else if (error && !initialized) {
      setInitialized(true);
    }
  }, [data, error, initialized]);

  const mutation = useMutation({
    mutationFn: (data: CreateSecurityHeadersRequest) => updateSecurityHeaders(hostId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-headers', hostId] });
      alert('Security headers settings saved!');
    },
    onError: (err) => alert(`Error: ${err.message}`),
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-white">Security Headers</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">HTTP security headers for browser protection</p>
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

      {/* HSTS Settings */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
        <h4 className="font-medium text-slate-800 dark:text-slate-200">HSTS (HTTP Strict Transport Security)</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hsts_enabled}
            onChange={(e) => setFormData((prev) => ({ ...prev, hsts_enabled: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm">Enable HSTS</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Max Age (seconds)</label>
            <input
              type="number"
              value={formData.hsts_max_age}
              onChange={(e) => setFormData((prev) => ({ ...prev, hsts_max_age: Number(e.target.value) }))}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hsts_include_subdomains}
              onChange={(e) => setFormData((prev) => ({ ...prev, hsts_include_subdomains: e.target.checked }))}
              className="rounded border-slate-300 text-primary-600"
            />
            <span className="text-xs">Include Subdomains</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hsts_preload}
              onChange={(e) => setFormData((prev) => ({ ...prev, hsts_preload: e.target.checked }))}
              className="rounded border-slate-300 text-primary-600"
            />
            <span className="text-xs">Preload</span>
          </label>
        </div>
      </div>

      {/* Other Headers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">X-Frame-Options</label>
          <select
            value={formData.x_frame_options}
            onChange={(e) => setFormData((prev) => ({ ...prev, x_frame_options: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="DENY">DENY</option>
            <option value="SAMEORIGIN">SAMEORIGIN</option>
            <option value="">None</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referrer-Policy</label>
          <select
            value={formData.referrer_policy}
            onChange={(e) => setFormData((prev) => ({ ...prev, referrer_policy: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="no-referrer">no-referrer</option>
            <option value="no-referrer-when-downgrade">no-referrer-when-downgrade</option>
            <option value="origin">origin</option>
            <option value="origin-when-cross-origin">origin-when-cross-origin</option>
            <option value="same-origin">same-origin</option>
            <option value="strict-origin">strict-origin</option>
            <option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</option>
            <option value="unsafe-url">unsafe-url</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.x_content_type_options}
            onChange={(e) => setFormData((prev) => ({ ...prev, x_content_type_options: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm">X-Content-Type-Options: nosniff</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.x_xss_protection}
            onChange={(e) => setFormData((prev) => ({ ...prev, x_xss_protection: e.target.checked }))}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm">X-XSS-Protection: 1; mode=block</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content-Security-Policy</label>
        <textarea
          value={formData.content_security_policy}
          onChange={(e) => setFormData((prev) => ({ ...prev, content_security_policy: e.target.value }))}
          placeholder="default-src 'self'; script-src 'self' 'unsafe-inline'"
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
