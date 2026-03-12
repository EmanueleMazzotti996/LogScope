import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ConfigPanel from './components/ConfigPanel';
import ResultsPanel from './components/ResultsPanel';
import LogViewer from './components/LogViewer';
import AboutTab from './components/AboutTab';

// Check if running inside Electron
const isElectron = typeof window !== 'undefined' && window.godlog;

export default function App() {
  const [activeTab, setActiveTab] = useState('extract');
  const [config, setConfig] = useState({
    sourceRoot: 'D:\\DataDisk\\AbacoServerData',
    destination: '',
    dates: [],
    clients: [],
  });
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [fileSearch, setFileSearch] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [extractedFiles, setExtractedFiles] = useState([]);
  const [filterTypes, setFilterTypes] = useState(['ics', 'server']);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Helper per mostrare loader anche in task sincrone pesanti (React rendering)
  const withLoading = async (fn) => {
    setGlobalLoading(true);
    // Piccolo delay per permettere al loader di renderizzarsi prima del blocco event loop
    await new Promise(r => setTimeout(r, 50));
    try {
      await fn();
    } finally {
      setGlobalLoading(false);
    }
  };

  const processFiles = (files) => {
    return files.map(f => ({
      ...f,
      displayDate: formatLogDate(f.logDate),
      displaySize: formatFileSize(f.size),
      nameLower: (f.name || '').toLowerCase()
    })).sort((a, b) => {
      const dateA = parseLogDate(a.logDate);
      const dateB = parseLogDate(b.logDate);
      return dateB - dateA; // Descendente
    });
  };

  // Listen for extraction progress
  useEffect(() => {
    if (!isElectron) return;
    const cleanup = window.godlog.onExtractionProgress((data) => {
      setProgress(data);
    });
    return cleanup;
  }, []);

  // Auto-load local logs_organized if exists
  useEffect(() => {
    if (!isElectron) return;
    const init = async () => {
      try {
        setGlobalLoading(true);
        // Check current directory for logs_organized
        const appPath = await window.godlog.getAppPath();
        const localLogs = `${appPath}\\logs_organized`;
        const files = await window.godlog.listExtractedFiles(localLogs);
        if (files && files.length > 0) {
          setConfig(prev => ({ ...prev, destination: localLogs }));
          setExtractedFiles(processFiles(files));
        }
      } catch (e) {
        console.log("No local logs found directly", e);
      } finally {
        setGlobalLoading(false);
      }
    };
    init();
  }, [isElectron]);

  const handleResetFiles = useCallback(() => {
    setConfig(prev => ({ ...prev, destination: '' }));
    setExtractedFiles([]);
    setFileSearch('');
    setFilterTypes(['ics', 'server']);
  }, []);

  const toggleFilter = useCallback((type) => {
    setFilterTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  }, []);

  const handleExtract = useCallback(async () => {
    if (!isElectron) return;
    if (config.dates.length === 0 || config.clients.length === 0) return;
    if (!config.destination) return;

    setIsExtracting(true);
    setResults([]);
    setProgress({ completed: 0, total: 1 });

    try {
      const result = await window.godlog.extractLogs({
        sourceRoot: config.sourceRoot,
        destination: config.destination,
        dates: config.dates,
        clients: config.clients,
      });
      setResults(result.results || []);
      if (!result.success && result.error) {
        setResults([{ status: 'error', message: result.error }]);
      }
    } catch (err) {
      setResults([{ status: 'error', message: err.message }]);
    } finally {
      setIsExtracting(false);
      setProgress(null);
    }
  }, [config]);

  const handleOpenViewer = useCallback(async (filePath) => {
    if (!isElectron) return;
    await withLoading(async () => {
      setViewerFile({ path: filePath, loading: true });
      setActiveTab('viewer');
      try {
        const data = await window.godlog.readLogFile(filePath);
        setViewerFile({ path: filePath, ...data, loading: false });
      } catch (err) {
        setViewerFile({ path: filePath, error: err.message, loading: false });
      }
    });
  }, []);

  const handleRefreshFiles = useCallback(async () => {
    if (!isElectron || !config.destination) return;
    await withLoading(async () => {
      try {
        const files = await window.godlog.listExtractedFiles(config.destination);
        setExtractedFiles(processFiles(files));
      } catch (err) {
        console.error("Refresh failed", err);
      }
    });
  }, [config.destination, isElectron]);

  const filteredFiles = useMemo(() => {
    return extractedFiles.filter(f => {
      // First apply type filtering
      const nameLower = f.nameLower || (f.name || '').toLowerCase();
      const matchesIcs = filterTypes.includes('ics') && nameLower.includes('icslog');
      const matchesServer = filterTypes.includes('server') && nameLower.includes('serverlibrary');
      
      if (filterTypes.length > 0 && !matchesIcs && !matchesServer) return false;
      if (filterTypes.length === 0) return false;

      if (!fileSearch) return true;
      const searchLower = fileSearch.toLowerCase();
      return (
        f.nameLower.includes(searchLower) ||
        f.clientName.toLowerCase().includes(searchLower) ||
        f.logDate.toLowerCase().includes(searchLower) ||
        f.displayDate.toLowerCase().includes(searchLower) ||
        (f.relativePath && f.relativePath.toLowerCase().includes(searchLower))
      );
    });
  }, [extractedFiles, filterTypes, fileSearch]);

  useEffect(() => {
    if (config.destination && results.length > 0) {
      handleRefreshFiles();
    }
  }, [results, config.destination, handleRefreshFiles]);

  return (
    <div className="app">
      {/* Global Loader Overlay */}
      {globalLoading && (
        <div className="global-loading-overlay">
          <div className="spinner-premium"></div>
          <div className="loading-text">Caricamento dati in corso...</div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="url(#logo-grad)" />
                <path d="M7 8h14M7 12h10M7 16h12M7 20h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-title">LogScope</span>
              <span className="logo-subtitle">by EM</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'extract' ? 'active' : ''}`}
            onClick={() => setActiveTab('extract')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Estrai Log
          </button>
          <button
            className={`nav-item ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            Analisi Log
          </button>
          <button
            className={`nav-item ${activeTab === 'viewer' ? 'active' : ''}`}
            onClick={() => setActiveTab('viewer')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Log Viewer
          </button>
          <button
            className={`nav-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Guida
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="version-badge">v1.0.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'extract' && (
          <div className="page">
            <div className="page-header">
              <h1>Estrazione Log</h1>
              <p className="page-desc">Configura sorgente, destinazione, date e client per estrarre i log di Abaco Server.</p>
            </div>
            <ConfigPanel
              config={config}
              setConfig={setConfig}
              onExtract={handleExtract}
              isExtracting={isExtracting}
              isElectron={isElectron}
            />
            {(progress || results.length > 0) && (
              <ResultsPanel
                results={results}
                progress={progress}
                isExtracting={isExtracting}
                onOpenFile={handleOpenViewer}
              />
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="page">
            <div className="page-header">
              <h1>File Estratti</h1>
              <p className="page-desc">Log precedentemente estratti nella cartella di destinazione.</p>
            </div>
            <div className="card">
              <div className="card-toolbar" style={{ padding: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={async () => {
                  const folder = await window.godlog.browseFolder({ title: 'Seleziona cartella Log da analizzare' });
                  if (folder) {
                    await withLoading(async () => {
                      setConfig(prev => ({ ...prev, destination: folder }));
                      const files = await window.godlog.listExtractedFiles(folder);
                      setExtractedFiles(processFiles(files));
                    });
                  }
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
                  </svg>
                  Importa cartella log...
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {config.destination && (
                    <button className="btn btn-danger btn-sm" onClick={handleResetFiles} style={{ padding: '4px 8px', fontSize: 11 }}>
                      Resetta Analisi
                    </button>
                  )}
                  {config.destination && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      Percorso: {config.destination}
                    </span>
                  )}
                </div>
              </div>

              {!config.destination ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <p>Seleziona una cartella di log da analizzare o usa la tab "Estrai Log"</p>
                </div>
              ) : extractedFiles.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p>Nessun file trovato in questa cartella</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={handleRefreshFiles}>Aggiorna</button>
                  </div>
                </div>
              ) : (
                <div className="file-list">
                  <div className="file-list-header">
                  <span style={{ marginRight: '16px' }}>{filteredFiles.length} file trovati</span>
                    <button className="btn btn-secondary btn-sm" onClick={handleRefreshFiles}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                      </svg>
                      Aggiorna
                    </button>
                    <div className="search-row-layout">
                      <div className="filter-chips">
                        <button 
                          className={`filter-chip ${filterTypes.includes('ics') ? 'active' : ''}`}
                          onClick={() => toggleFilter('ics')}
                        >
                          ICS Log
                        </button>
                        <button 
                          className={`filter-chip ${filterTypes.includes('server') ? 'active' : ''}`}
                          onClick={() => toggleFilter('server')}
                        >
                          Server Lib
                        </button>
                      </div>
                      <div className="search-box-sm">
                        <input
                          type="text"
                          placeholder="Filtra per Client o Data..."
                          value={fileSearch}
                          style={{ 
                            fontSize: 12, 
                            padding: '6px 10px', 
                            borderRadius: 6, 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            color: 'white',
                            width: '220px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFileSearch(val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {filteredFiles.map((f, i) => (
                      <div key={i} className="file-item" onClick={() => handleOpenViewer(f.path)}>
                        <div className="file-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="file-info">
                          <div className="file-main-meta">
                            <span className="main-client">{f.clientName}</span>
                            <span className="main-date">{f.displayDate}</span>
                            {f.nameLower.includes('icslog') ? (
                              <span className="log-type-badge badge-ics">ICS Log</span>
                            ) : f.nameLower.includes('serverlibrary') ? (
                              <span className="log-type-badge badge-server">Server Lib</span>
                            ) : (
                              <span className="log-type-badge badge-generic">Log</span>
                            )}
                          </div>
                          <span className="file-name-sub">{f.name}</span>
                          <span className="file-size-sub">{f.displaySize}</span>
                        </div>
                        <div className="file-action">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'viewer' && (
          <div className="page">
            <div className="page-header">
              <h1>Log Viewer</h1>
              <p className="page-desc">Visualizza e cerca nel contenuto dei file di log.</p>
            </div>
            <LogViewer file={viewerFile} onOpenFile={handleOpenViewer} isElectron={isElectron} />
          </div>
        )}

        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  );
}

// Date Parsing Utility: Handles MM/DD/YY and YYYY-MM-DD
function parseLogDate(dateStr) {
  if (!dateStr || dateStr === 'Sconosciuta') return new Date(0);

  // Format 1: MM/DD/YY (icslog)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [m, d, y] = parts;
      // Handle 2-digit year (assume 20xx)
      if (y.length === 2) y = '20' + y;
      return new Date(y, m - 1, d);
    }
  }

  // Format 2: YYYY-MM-DD (ServerLibrary)
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return new Date(y, m - 1, d);
    }
  }

  return new Date(dateStr);
}

// Date Formatting Utility: Displays as "12 Feb 2025"
function formatLogDate(dateStr) {
  const date = parseLogDate(dateStr);
  if (date.getTime() === 0) return 'Sconosciuta';

  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
