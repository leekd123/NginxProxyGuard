import { useTranslation } from 'react-i18next';
import type { URIBlockWithHost } from '../../api/security';

interface RulesTabProps {
  hostFilter: string;
  setHostFilter: (v: string) => void;
  hosts: string[];
  filteredBlocks: URIBlockWithHost[];
  updateIsPending: boolean;
  deleteIsPending: boolean;
  onToggleEnabled: (block: URIBlockWithHost) => void;
  onOpenHostModal: (block: URIBlockWithHost) => void;
  onDeleteBlock: (proxyHostId: string) => void;
}

export function RulesTab({
  hostFilter,
  setHostFilter,
  hosts,
  filteredBlocks,
  updateIsPending,
  deleteIsPending,
  onToggleEnabled,
  onOpenHostModal,
  onDeleteBlock,
}: RulesTabProps) {
  const { t } = useTranslation('waf');

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={hostFilter}
          onChange={(e) => setHostFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
        >
          <option value="all">{t('uriBlock.filters.allHosts')}</option>
          {hosts.map(host => (
            <option key={host} value={host}>{host}</option>
          ))}
        </select>
      </div>

      {/* Hosts List */}
      {filteredBlocks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            {t('uriBlock.empty.title')}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('uriBlock.empty.description')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('uriBlock.table.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('uriBlock.table.host')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('uriBlock.table.rules')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('uriBlock.table.settings')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('uriBlock.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredBlocks.map(block => (
                <tr
                  key={block.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                  onClick={() => onOpenHostModal(block)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleEnabled(block)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        block.enabled && block.host_enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      disabled={updateIsPending}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        block.enabled && block.host_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {block.domain_names[0]}
                    </div>
                    {block.domain_names.length > 1 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        +{block.domain_names.length - 1} {t('uriBlock.moreHosts')}
                      </div>
                    )}
                    {!block.host_enabled && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        ({t('uriBlock.hostDisabled')})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400">
                      {block.rules.filter(r => r.enabled).length} {t('uriBlock.rulesCount')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      {block.exception_ips.length > 0 && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                          {block.exception_ips.length} {t('uriBlock.exceptions')}
                        </span>
                      )}
                      {block.allow_private_ips && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                          {t('uriBlock.privateAllowed')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onOpenHostModal(block)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                        title={t('common:edit')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('uriBlock.confirmDeleteHost', { host: block.domain_names[0] }) || `Are you sure you want to delete URI blocking for ${block.domain_names[0]}?`)) {
                            onDeleteBlock(block.proxy_host_id);
                          }
                        }}
                        disabled={deleteIsPending}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('common:delete')}
                      >
                        {deleteIsPending ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
