import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getSecurityHeaders, updateSecurityHeaders, applySecurityHeaderPreset } from '../../api/security';
import type { CreateSecurityHeadersRequest } from '../../types/security';
import type { SecurityTabProps } from './types';

export default function SecurityHeadersTab({ proxyHostId }: SecurityTabProps) {
  const { t } = useTranslation('proxyHost');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['security-headers', proxyHostId],
    queryFn: () => getSecurityHeaders(proxyHostId),
  });

  const mutation = useMutation({
    mutationFn: (data: CreateSecurityHeadersRequest) => updateSecurityHeaders(proxyHostId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-headers', proxyHostId] }),
  });

  const presetMutation = useMutation({
    mutationFn: (preset: string) => applySecurityHeaderPreset(proxyHostId, preset),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security-headers', proxyHostId] }),
  });

  const [form, setForm] = useState({
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
  });

  if (data && !form.enabled && data.enabled) {
    setForm({
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
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) return <div className="text-center py-4">{t('common:status.loading')}</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="font-medium">{t('form.protection.securityHeaders.enabled')}</span>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => presetMutation.mutate('strict')}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            {t('form.protection.securityHeaders.preset.strict')}
          </button>
          <button
            type="button"
            onClick={() => presetMutation.mutate('moderate')}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            {t('form.protection.securityHeaders.preset.moderate')}
          </button>
          <button
            type="button"
            onClick={() => presetMutation.mutate('relaxed')}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            {t('form.protection.securityHeaders.preset.relaxed')}
          </button>
        </div>
      </div>

      {form.enabled && (
        <>
          <div className="border dark:border-slate-700 rounded-md p-3 space-y-3">
            <h4 className="font-medium text-sm">{t('form.protection.securityHeaders.hsts')}</h4>
            <div className="grid grid-cols-4 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hsts_enabled}
                  onChange={(e) => setForm({ ...form, hsts_enabled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{t('form.protection.securityHeaders.hstsEnabled')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hsts_include_subdomains}
                  onChange={(e) => setForm({ ...form, hsts_include_subdomains: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{t('form.protection.securityHeaders.includeSubdomains')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hsts_preload}
                  onChange={(e) => setForm({ ...form, hsts_preload: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{t('form.protection.securityHeaders.preload')}</span>
              </label>
              <div>
                <select
                  value={form.hsts_max_age}
                  onChange={(e) => setForm({ ...form, hsts_max_age: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border rounded"
                >
                  <option value={86400}>{t('form.protection.securityHeaders.maxAge.1day')}</option>
                  <option value={604800}>{t('form.protection.securityHeaders.maxAge.1week')}</option>
                  <option value={2592000}>{t('form.protection.securityHeaders.maxAge.30days')}</option>
                  <option value={31536000}>{t('form.protection.securityHeaders.maxAge.1year')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.protection.securityHeaders.xFrameOptions')}</label>
              <select
                value={form.x_frame_options}
                onChange={(e) => setForm({ ...form, x_frame_options: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="DENY">DENY</option>
                <option value="SAMEORIGIN">SAMEORIGIN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.protection.securityHeaders.referrerPolicy')}</label>
              <select
                value={form.referrer_policy}
                onChange={(e) => setForm({ ...form, referrer_policy: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="no-referrer">no-referrer</option>
                <option value="no-referrer-when-downgrade">no-referrer-when-downgrade</option>
                <option value="origin">origin</option>
                <option value="origin-when-cross-origin">origin-when-cross-origin</option>
                <option value="same-origin">same-origin</option>
                <option value="strict-origin">strict-origin</option>
                <option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.x_content_type_options}
                onChange={(e) => setForm({ ...form, x_content_type_options: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.protection.securityHeaders.xContentType')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.x_xss_protection}
                onChange={(e) => setForm({ ...form, x_xss_protection: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('form.protection.securityHeaders.xssProtection')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('form.protection.securityHeaders.csp')}
            </label>
            <textarea
              value={form.content_security_policy}
              onChange={(e) => setForm({ ...form, content_security_policy: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
              rows={3}
              placeholder="default-src 'self'; script-src 'self' 'unsafe-inline';"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {mutation.isPending ? t('common:status.saving') : t('common:buttons.save')}
      </button>
    </form>
  );
}
