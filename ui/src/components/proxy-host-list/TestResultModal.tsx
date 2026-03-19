import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '../common/HelpTip'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { ProxyHost, ProxyHostTestResult } from '../../types/proxy-host'

interface TestResultModalProps {
  host: ProxyHost
  result: ProxyHostTestResult | null
  isLoading: boolean
  error: string | null
  onClose: () => void
  onRetest: () => void
}

export function TestResultModal({
  host,
  result,
  isLoading,
  error,
  onClose,
  onRetest
}: TestResultModalProps) {
  const { t } = useTranslation('proxyHost')
  const [activeTab, setActiveTab] = useState<'summary' | 'ssl' | 'http' | 'cache' | 'security' | 'headers'>('summary')

  useEscapeKey(onClose)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('test.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{host.domain_names[0]}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRetest}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('test.retest')}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">{t('test.testing')}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-2">{t('test.failed')}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Result Content */}
        {result && !isLoading && (
          <>
            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-700">
              <nav className="flex gap-1 -mb-px">
                {[
                  { id: 'summary', label: t('test.tabs.summary') },
                  { id: 'ssl', label: t('test.tabs.ssl') },
                  { id: 'http', label: t('test.tabs.http') },
                  { id: 'cache', label: t('test.tabs.cache') },
                  { id: 'security', label: t('test.tabs.security') },
                  { id: 'headers', label: t('test.tabs.headers') },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'summary' && <SummaryTab result={result} host={host} />}
              {activeTab === 'ssl' && <SSLTab result={result} />}
              {activeTab === 'http' && <HTTPTab result={result} host={host} />}
              {activeTab === 'cache' && <CacheTab result={result} host={host} />}
              {activeTab === 'security' && <SecurityTab result={result} />}
              {activeTab === 'headers' && <HeadersTab result={result} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Summary Tab
function SummaryTab({ result, host }: { result: ProxyHostTestResult; host: ProxyHost }) {
  const { t } = useTranslation('proxyHost')
  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className={`p-4 rounded-lg ${result.success
        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
        <div className="flex items-center gap-3">
          {result.success ? (
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <div>
            <h3 className={`font-semibold ${result.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
              {result.success ? t('test.passed') : t('test.failed')}
            </h3>
            <p className={`text-sm ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.error || `${t('test.responseTime')}: ${result.response_time_ms}ms • ${t('test.statusCode')}: ${result.status_code}`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('test.responseTime')}
          value={`${result.response_time_ms}ms`}
          status={result.response_time_ms < 500 ? 'good' : result.response_time_ms < 2000 ? 'warning' : 'bad'}
          help={t('test.help.responseTime')}
        />
        <StatCard
          label={t('test.statusCode')}
          value={result.status_code?.toString() || 'N/A'}
          status={result.status_code && result.status_code < 400 ? 'good' : 'bad'}
          help={t('test.help.statusCode')}
        />
        <StatCard
          label={t('test.protocol')}
          value={result.http?.protocol || 'N/A'}
          status={result.http?.http2_enabled ? 'good' : 'warning'}
          help={t('test.help.protocol')}
        />
        <StatCard
          label={t('test.ssl')}
          value={result.ssl?.enabled ? (result.ssl.valid ? t('test.valid') : t('test.invalid')) : t('test.disabled')}
          status={result.ssl?.enabled ? (result.ssl.valid ? 'good' : 'bad') : 'neutral'}
          help={t('test.help.ssl')}
        />
      </div>

      {/* Feature Check */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('test.featureVerification')}</h4>
        <div className="grid grid-cols-2 gap-2">
          <FeatureCheck label={t('test.tabs.ssl')} configured={host.ssl_enabled} detected={result.ssl?.enabled} />
          <FeatureCheck label="HTTP/2" configured={host.ssl_http2} detected={result.http?.http2_enabled} />
          <FeatureCheck label="HTTP/3 (QUIC)" configured={host.ssl_http3} detected={result.http?.http3_enabled} />
          <FeatureCheck label={t('test.tabs.cache')} configured={host.cache_enabled} detected={!!result.cache?.cache_status} />
          <FeatureCheck label="HSTS" configured={true} detected={result.security?.hsts} />
          <FeatureCheck label="X-Frame-Options" configured={true} detected={!!result.security?.x_frame_options} />
        </div>
      </div>

      {/* Test Time */}
      <div className="text-xs text-slate-400 text-right">
        {t('test.testedAt')}: {new Date(result.tested_at).toLocaleString()}
      </div>
    </div>
  )
}

function StatCard({ label, value, status, help }: { label: string; value: string; status: 'good' | 'warning' | 'bad' | 'neutral', help?: string }) {
  const colors = {
    good: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400',
    warning: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400',
    bad: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400',
    neutral: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
  }
  return (
    <div className={`p-3 rounded-lg border ${colors[status]}`}>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs opacity-75">{label}</p>
        {help && <HelpTip content={help} className="!text-current opacity-75 hover:opacity-100" />}
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function FeatureCheck({ label, configured, detected }: { label: string; configured?: boolean; detected?: boolean }) {
  const { t } = useTranslation('proxyHost')
  const match = configured === detected
  const icon = detected ? (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${match
      ? 'bg-slate-50 dark:bg-slate-800'
      : 'bg-amber-50 dark:bg-amber-900/20'}`}>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {icon}
        {!match && configured && !detected && (
          <span className="text-xs text-amber-600 dark:text-amber-400">{t('test.notDetected')}</span>
        )}
      </div>
    </div>
  )
}

// SSL Tab
function SSLTab({ result }: { result: ProxyHostTestResult }) {
  const { t } = useTranslation('proxyHost')
  const ssl = result.ssl

  if (!ssl?.enabled) {
    return (
      <div className="text-center py-8 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="dark:text-slate-400">{t('test.sslNotEnabled')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${ssl.valid
        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
        <div className="flex items-center gap-2">
          {ssl.valid ? (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className={`font-medium ${ssl.valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {ssl.valid ? t('test.validCert') : t('test.invalidCert')}
          </span>
        </div>
        {ssl.error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{ssl.error}</p>}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow label={t('test.sslDetails.protocol')} value={ssl.protocol} help={t('test.help.sslDetails.protocol')} />
            <DetailRow label={t('test.sslDetails.cipherSuite')} value={ssl.cipher} help={t('test.help.sslDetails.cipherSuite')} />
            <DetailRow label={t('test.sslDetails.subject')} value={ssl.subject} />
            <DetailRow label={t('test.sslDetails.issuer')} value={ssl.issuer} />
            <DetailRow label={t('test.sslDetails.validFrom')} value={ssl.not_before ? new Date(ssl.not_before).toLocaleDateString() : undefined} help={t('test.help.sslDetails.validity')} />
            <DetailRow label={t('test.sslDetails.validUntil')} value={ssl.not_after ? new Date(ssl.not_after).toLocaleDateString() : undefined} />
            <DetailRow
              label={t('test.sslDetails.daysRemaining')}
              value={ssl.days_remaining?.toString()}
              highlight={ssl.days_remaining !== undefined && ssl.days_remaining < 30 ? 'warning' : undefined}
              help={t('test.help.sslDetails.daysRemaining')}
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}

// HTTP Tab
function HTTPTab({ result, host }: { result: ProxyHostTestResult; host: ProxyHost }) {
  const { t } = useTranslation('proxyHost')
  const http = result.http

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('test.http.protocolInfo')}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('test.http.detectedProtocol')}</span>
              <HelpTip content={t('test.help.protocol')} />
            </div>
            <span className="font-medium text-slate-900 dark:text-white">{http?.protocol || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('test.responseTime')}</span>
              <HelpTip content={t('test.help.responseTime')} />
            </div>
            <span className="font-medium text-slate-900 dark:text-white">{result.response_time_ms}ms</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('test.http.versionSupport')}</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${http?.http2_enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">H2</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium text-slate-900 dark:text-white">HTTP/2</p>
                  <HelpTip content={t('test.help.http.http2')} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('test.http.multiplexing')}</p>
              </div>
            </div>
            <StatusBadge enabled={http?.http2_enabled} configured={host.ssl_http2} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${http?.http3_enabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">H3</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium text-slate-900 dark:text-white">HTTP/3 (QUIC)</p>
                  <HelpTip content={t('test.help.http.http3')} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('test.http.quic')}</p>
              </div>
            </div>
            <StatusBadge enabled={http?.http3_enabled} configured={host.ssl_http3} />
          </div>
        </div>
      </div>

      {http?.alt_svc_header && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-1 mb-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('test.http.altSvc')}</h4>
            <HelpTip content={t('test.help.http.altSvc')} />
          </div>
          <code className="block p-3 bg-slate-50 dark:bg-slate-900 rounded text-xs text-slate-700 dark:text-slate-300 break-all">
            {http.alt_svc_header}
          </code>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {t('test.http.altSvcDesc')}
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ enabled, configured }: { enabled?: boolean; configured?: boolean }) {
  const { t } = useTranslation('proxyHost')
  if (enabled) {
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('status.active')}</span>
  }
  if (configured && !enabled) {
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('test.notDetected')}</span>
  }
  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">{t('test.disabled')}</span>
}

// Cache Tab
function CacheTab({ result, host }: { result: ProxyHostTestResult; host: ProxyHost }) {
  const { t } = useTranslation('proxyHost')
  const cache = result.cache

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${cache?.cache_status
        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
        : 'bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cache?.cache_status
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-slate-200 dark:bg-slate-700'}`}>
            <svg className={`w-5 h-5 ${cache?.cache_status
              ? 'text-green-600 dark:text-green-400'
              : 'text-slate-400 dark:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className={`font-medium ${cache?.cache_status ? 'text-green-800 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>
                {cache?.cache_status ? `${t('test.cache.status')} ${cache.cache_status}` : t('test.cache.noStatus')}
              </h3>
              <HelpTip content={t('test.help.cache.status')} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {host.cache_enabled ? t('test.cache.enabled') : t('test.cache.disabled')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('test.cache.headers')}</h4>
          <HelpTip content={t('test.help.cache.control')} />
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow label="X-Cache-Status" value={cache?.cache_status} description="Nginx cache status" />
            <DetailRow label="Cache-Control" value={cache?.cache_control} description="Browser caching directives" />
            <DetailRow label="Expires" value={cache?.expires} description="Expiration date" />
            <DetailRow label="ETag" value={cache?.etag} description="Resource version identifier" />
            <DetailRow label="Last-Modified" value={cache?.last_modified} description="Resource modification date" />
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('test.cache.legend')}</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="font-medium text-green-600 dark:text-green-400">HIT</span> - <span className="dark:text-slate-400">{t('test.cache.hit')}</span></div>
          <div><span className="font-medium text-amber-600 dark:text-amber-400">MISS</span> - <span className="dark:text-slate-400">{t('test.cache.miss')}</span></div>
          <div><span className="font-medium text-blue-600 dark:text-blue-400">EXPIRED</span> - <span className="dark:text-slate-400">{t('test.cache.expired')}</span></div>
          <div><span className="font-medium text-slate-600 dark:text-slate-500">BYPASS</span> - <span className="dark:text-slate-400">{t('test.cache.bypass')}</span></div>
        </div>
      </div>
    </div>
  )
}

// Security Tab
function SecurityTab({ result }: { result: ProxyHostTestResult }) {
  const { t } = useTranslation('proxyHost')
  const sec = result.security

  const headers = [
    { name: 'HSTS', value: sec?.hsts_value, enabled: sec?.hsts, description: t('test.security.desc.hsts') },
    { name: 'X-Frame-Options', value: sec?.x_frame_options, enabled: !!sec?.x_frame_options, description: t('test.security.desc.xframe') },
    { name: 'X-Content-Type-Options', value: sec?.x_content_type_options, enabled: !!sec?.x_content_type_options, description: t('test.security.desc.xcontent') },
    { name: 'X-XSS-Protection', value: sec?.xss_protection, enabled: !!sec?.xss_protection, description: t('test.security.desc.xxss') },
    { name: 'Referrer-Policy', value: sec?.referrer_policy, enabled: !!sec?.referrer_policy, description: t('test.security.desc.referrer') },
    { name: 'Permissions-Policy', value: sec?.permissions_policy, enabled: !!sec?.permissions_policy, description: t('test.security.desc.permissions') },
    { name: 'Content-Security-Policy', value: sec?.content_security_policy, enabled: !!sec?.content_security_policy, description: t('test.security.desc.csp') },
  ]

  const enabledCount = headers.filter(h => h.enabled).length

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('test.security.score')}</h4>
            <HelpTip content={t('test.help.security.score')} />
          </div>
          <span className={`text-2xl font-bold ${enabledCount >= 5 ? 'text-green-600 dark:text-green-400' : enabledCount >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {enabledCount}/{headers.length}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${enabledCount >= 5 ? 'bg-green-500' : enabledCount >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${(enabledCount / headers.length) * 100}%` }}
          />
        </div>
      </div>

      {sec?.server_header && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('test.security.serverExposed')}</p>
              <HelpTip content={t('test.help.security.server')} />
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Server: {sec.server_header}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('test.security.hideServer')}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('test.security.headers')}</h4>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {headers.map(header => (
            <div key={header.name} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {header.enabled ? (
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div className="flex items-center gap-1">
                    <span className={`font-medium ${header.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                      {header.name}
                    </span>
                    {header.description && <HelpTip content={header.description} />}
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{header.description}</span>
              </div>
              {header.value && (
                <code className="block mt-1 p-2 bg-slate-50 dark:bg-slate-900 rounded text-xs text-slate-600 dark:text-slate-400 break-all">
                  {header.value}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Headers Tab
function HeadersTab({ result }: { result: ProxyHostTestResult }) {
  const { t } = useTranslation('proxyHost')
  const headers = result.headers || {}
  const entries = Object.entries(headers).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('test.headers.response')}</h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">{entries.length} {t('test.headers.count')}</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-auto">
          {entries.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">{t('test.headers.none')}</div>
          ) : (
            entries.map(([key, value]) => (
              <div key={key} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start gap-4">
                  <span className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300 min-w-[200px]">{key}</span>
                  <span className="text-sm font-mono text-slate-500 dark:text-slate-400 break-all">{value}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, description, highlight, help }: { label: string; value?: string; description?: string; highlight?: 'warning', help?: string }) {
  return (
    <tr>
      <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 w-1/3">
        <div className="flex items-center gap-1">
          {label}
          {help && <HelpTip content={help} />}
        </div>
      </td>
      <td className={`px-4 py-2 text-sm font-mono ${highlight === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
        {value || <span className="text-slate-300 dark:text-slate-600">-</span>}
        {description && <span className="block text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">{description}</span>}
      </td>
    </tr>
  )
}
