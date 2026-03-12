import React, { useMemo } from 'react';

function formatFileSize(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ResultsPanel({ results, progress, isExtracting, onOpenFile }) {
  const stats = useMemo(() => {
    const s = { success: 0, warning: 0, error: 0, not_found: 0, total: results.length };
    for (const r of results) {
      if (s[r.status] !== undefined) s[r.status]++;
    }
    return s;
  }, [results]);

  const progressPercent = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Risultati Estrazione
      </div>

      {/* Progress */}
      {isExtracting && progress && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-text">
            <span>Estrazione in corso...</span>
            <span>{progress.completed}/{progress.total} ({progressPercent}%)</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {results.length > 0 && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value total">{stats.total}</div>
              <div className="stat-label">Totale</div>
            </div>
            <div className="stat-card">
              <div className="stat-value success">{stats.success}</div>
              <div className="stat-label">Copiati</div>
            </div>
            <div className="stat-card">
              <div className="stat-value warning">{stats.warning + stats.not_found}</div>
              <div className="stat-label">Non trovati</div>
            </div>
            <div className="stat-card">
              <div className="stat-value error">{stats.error}</div>
              <div className="stat-label">Errori</div>
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div key={i} className={`result-item ${r.status}`}>
                <span className="result-icon">
                  {r.status === 'success' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {r.status === 'warning' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                  {r.status === 'error' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  {r.status === 'not_found' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  )}
                </span>
                <span className="result-message">{r.message}</span>
                {r.size && <span className="result-size">{formatFileSize(r.size)}</span>}
                {r.status === 'success' && r.newName && (
                  <button
                    className="result-open-btn"
                    onClick={() => {
                      const destDir = r.message.replace('Copiato: ', '');
                      // We pass the full destination path from the parent
                      onOpenFile && onOpenFile(
                        r._destPath || r.message // Fallback, but ideally we'd have the path
                      );
                    }}
                  >
                    Apri
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
