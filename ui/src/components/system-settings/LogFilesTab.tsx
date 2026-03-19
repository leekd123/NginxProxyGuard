import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLogFiles,
  viewLogFile,
  downloadLogFile,
  deleteLogFile,
  triggerLogRotation,
} from '../../api/settings';
import type { LogFileInfo } from '../../types/settings';
import { formatBytes } from '../log-viewer/utils';

export function LogFilesTab() {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation('settings');
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [_downloadError, setDownloadError] = useState<string | null>(null);

  const { data: logFilesData, refetch: refetchLogFiles } = useQuery({
    queryKey: ['logFiles'],
    queryFn: getLogFiles,
  });

  const viewFileMutation = useMutation({
    mutationFn: ({ filename, lines }: { filename: string; lines: number }) => viewLogFile(filename, lines),
    onSuccess: (data) => { setViewContent(data.content); },
  });

  const deleteFileMutation = useMutation({
    mutationFn: deleteLogFile,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logFiles'] }); setConfirmDelete(null); },
  });

  const rotateMutation = useMutation({
    mutationFn: triggerLogRotation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['logFiles'] }); },
  });

  const handleViewFile = (filename: string) => {
    setViewingFile(filename);
    setViewContent('');
    viewFileMutation.mutate({ filename, lines: 200 });
  };

  const handleDownloadFile = async (filename: string) => {
    try { await downloadLogFile(filename); } catch {
      setDownloadError(t('rawLogs.downloadFailed') || 'Download failed');
      setTimeout(() => setDownloadError(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`p-5 rounded-xl border ${logFilesData?.raw_log_enabled ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">{t('system.logfiles.status.title')}</h3>
            <p className="text-sm mt-1.5">
              {logFilesData?.raw_log_enabled ? (
                <span className="text-emerald-700 dark:text-emerald-400">{t('system.logfiles.status.activeDescription', { count: logFilesData?.total_count ?? 0, size: formatBytes(logFilesData?.total_size ?? 0) })}</span>
              ) : (
                <span className="text-slate-600 dark:text-slate-400">{t('system.logfiles.status.inactiveDescription')}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetchLogFiles()} className="px-3 py-2 text-sm font-medium bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            {logFilesData?.raw_log_enabled && (
              <button onClick={() => rotateMutation.mutate()} disabled={rotateMutation.isPending} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {rotateMutation.isPending ? t('system.logfiles.actions.rotating') : t('system.logfiles.actions.rotate')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File List */}
      {(logFilesData?.files?.length ?? 0) > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{t('system.logfiles.list.title')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {logFilesData?.files.map((file: LogFileInfo) => (
              <div key={file.name} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file.log_type === 'access' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : file.log_type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {file.is_compressed ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-white text-sm">{file.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatBytes(file.size)}</span><span>•</span>
                      <span>{new Date(file.modified_at).toLocaleString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}</span>
                      {file.is_compressed && (<><span>•</span><span className="text-amber-600 dark:text-amber-400">{t('system.logfiles.list.compressed')}</span></>)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleViewFile(file.name)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title={t('system.logfiles.actions.preview')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => handleDownloadFile(file.name)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title={t('system.logfiles.actions.download')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  {file.name !== 'access.log' && file.name !== 'error.log' && (
                    <button onClick={() => setConfirmDelete(file.name)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={t('system.logfiles.actions.delete')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="text-slate-500 dark:text-slate-400">{t('system.logfiles.list.empty')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t('system.logfiles.list.emptyHint')}</p>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white">{viewingFile}</h3>
              <button onClick={() => { setViewingFile(null); setViewContent(''); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewFileMutation.isPending ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : (
                <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto">{viewContent || t('system.logfiles.list.emptyFile')}</pre>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => handleDownloadFile(viewingFile)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{t('system.logfiles.actions.download')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">{t('system.logfiles.delete.title')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <Trans i18nKey="system.logfiles.delete.confirm" values={{ file: confirmDelete }} components={{ 1: <span className="font-medium text-slate-700 dark:text-white" /> }} />
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">{t('system.buttons.cancel')}</button>
              <button onClick={() => deleteFileMutation.mutate(confirmDelete)} disabled={deleteFileMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">{deleteFileMutation.isPending ? t('system.logfiles.delete.deleting') : t('system.logfiles.actions.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
