import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import AnalyzerDashboard from './AnalyzerDashboard';
import { useLanguage } from '../i18n/LanguageContext';

export default function LogViewer({ file, onOpenFile, isElectron }) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFindAll, setShowFindAll] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [eventMap, setEventMap] = useState({});
  const [highlightedLine, setHighlightedLine] = useState(null);
  const viewerRef = useRef(null);
  const viewportHeight = 600; // Altezza stimata dell'area di visualizzazione
  const rowHeight = 22; // Altezza fissa di ogni riga per la virtualizzazione

  // Load eventmap.csv
  useEffect(() => {
    if (!isElectron) return;
    const loadMapping = async () => {
      try {
        const result = await window.godlog.getEventMapping();
        if (result && result.content) {
          const mapping = {};
          const rows = result.content.split('\n');
          // Skip header
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;
            // Native CSV handling (using semicolon as exported)
            // or comma if user reverted, checking both
            const delimiter = row.includes(';') ? ';' : ',';
            const parts = row.split(delimiter);
            if (parts.length >= 3) {
              const id = parts[0].trim();
              const eventName = parts[1].trim();
              const description = parts[2] ? parts[2].trim() : '';
              const labelDescription = parts[3] ? parts[3].trim() : '';
              mapping[id] = { 
                eventName, 
                description, 
                labelDescription: labelDescription || description || eventName
              };
            }
          }
          setEventMap(mapping);
        }
      } catch (e) {
        console.error("Failed to load event mapping", e);
      }
    };
    loadMapping();
  }, [isElectron]);

  const lines = useMemo(() => {
    if (!file?.content) return [];
    return file.content.split('\n');
  }, [file?.content]);

  const handleJumpToLine = useCallback((lineIndex) => {
    if (!viewerRef.current) return;
    const scrollPos = lineIndex * rowHeight;
    viewerRef.current.scrollTop = scrollPos;
    // Aggiorna lo stato per forzare il ricalcolo delle righe visibili
    setScrollTop(scrollPos);
    setHighlightedLine(lineIndex);

    // Rimuove l'evidenziazione dopo qualche secondo (opzionale, ma utile per feedback visivo)
    setTimeout(() => {
      setHighlightedLine(prev => prev === lineIndex ? null : prev);
    }, 4000);
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const results = useMemo(() => {
    if (!lines.length || !searchTerm || searchTerm.length < 3 || !showFindAll) return [];
    const term = searchTerm.toLowerCase();
    const matches = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (rawLine.toLowerCase().includes(term)) {
        // Extract level
        let level = 'INF';
        if (rawLine.includes('[ERR]') || rawLine.includes('(E)')) level = 'ERR';
        else if (rawLine.includes('[WRN]') || rawLine.includes('(W)')) level = 'WRN';
        else if (rawLine.includes('[DBG]')) level = 'DBG';
        else if (rawLine.includes('[VER]')) level = 'VER';

        // Extract timestamp (optional)
        // Format ICS: [01/19/26 08:11:51]
        // Format SRV: [2025-04-30 07.22.32]
        const tsMatch = rawLine.match(/\[(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\]|\[(\d{4}-\d{2}-\d{2} \d{2}[:\.]\d{2}[:\.]\d{2})\]/);
        const timestamp = tsMatch ? (tsMatch[1] || tsMatch[2]) : '';

        matches.push({
          line: rawLine,
          lineNum: i,
          level,
          timestamp
        });
      }
    }
    return matches;
  }, [lines, searchTerm, showFindAll]);

  const handleBrowseFile = useCallback(async () => {
    if (!isElectron) return;
    const result = await window.godlog.browseFolder({ title: t('viewer_browse_title') });
    if (result) {
      const files = await window.godlog.listExtractedFiles(result);
      if (files.length > 0) {
        onOpenFile(files[0].path);
      }
    }
  }, [isElectron, onOpenFile]);

  const matchCount = useMemo(() => {
    if (!lines.length || !searchTerm || searchTerm.length < 3) return 0;
    const term = searchTerm.toLowerCase();
    let count = 0;
    for (const line of lines) {
      if (line.toLowerCase().includes(term)) count++;
    }
    return count;
  }, [lines, searchTerm]);

  // Virtualization calculations
  const totalHeight = lines.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const endIndex = Math.min(lines.length - 1, Math.floor((scrollTop + viewportHeight) / rowHeight) + 5);

  const visibleLines = useMemo(() => {
    const term = (searchTerm && searchTerm.length >= 3) ? searchTerm.toLowerCase() : null;
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const line = lines[i];
      if (!term || !line.toLowerCase().includes(term)) {
        items.push({ content: line, highlights: false, index: i });
      } else {
        const parts = [];
        let lastIndex = 0;
        let idx = line.toLowerCase().indexOf(term);
        while (idx !== -1) {
          parts.push(line.substring(lastIndex, idx));
          parts.push(`<mark>${line.substring(idx, idx + term.length)}</mark>`);
          lastIndex = idx + term.length;
          idx = line.toLowerCase().indexOf(term, lastIndex);
        }
        parts.push(line.substring(lastIndex));
        items.push({ content: parts.join(''), highlights: true, index: i });
      }
    }
    return items;
  }, [lines, startIndex, endIndex, searchTerm]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!file) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>{t('viewer_no_file')}</p>
          <button className="btn btn-secondary" onClick={handleBrowseFile} disabled={!isElectron}>
            {t('viewer_browse_btn')}
          </button>
        </div>
      </div>
    );
  }

  if (file.loading) {
    return (
      <div className="card">
        <div className="viewer-loading">
          <span className="spinner" />
          {t('viewer_loading')}
        </div>
      </div>
    );
  }

  if (file.error) {
    return (
      <div className="card">
        <div className="result-item error">
          <span className="result-icon">⚠</span>
          <span className="result-message">{t('error')}: {file.error}</span>
        </div>
      </div>
    );
  }

  const fileName = file.path ? file.path.split(/[/\\]/).pop() : 'file';

  return (
    <div className="viewer-container">
      {/* 1. Intelligence Analysis (AnalyzerDashboard) */}
      {(file.path && (
        file.path.toLowerCase().includes('icslog') || 
        file.path.toLowerCase().includes('server')
      )) && (
        <div style={{ marginBottom: 16 }}>
          <AnalyzerDashboard 
            fileContent={file.content} 
            fileName={fileName} 
            clientName={file.clientName}
            onJumpToLine={handleJumpToLine} 
            eventMap={eventMap} 
          />
        </div>
      )}

      {/* 2. Search Toolbar */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div className="viewer-toolbar">
          <div className="viewer-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t('viewer_search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && searchTerm.length < 3 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8, opacity: 0.7 }}>
                {t('viewer_search_min_chars')}
              </span>
            )}
            {searchTerm && searchTerm.length >= 3 && (
              <button
                className={`btn btn-sm ${showFindAll ? 'btn-accent' : 'btn-secondary'}`}
                onClick={() => setShowFindAll(!showFindAll)}
                style={{ marginLeft: 8, whiteSpace: 'nowrap' }}
              >
                {t('viewer_find_all')}
              </button>
            )}
          </div>
          <div className="viewer-info">
            {searchTerm && searchTerm.length >= 3 && (
              <span className="viewer-info-badge">
                {t('viewer_matches_found', { count: matchCount })}
              </span>
            )}
            <span className="viewer-info-badge">{formatSize(file.size)}</span>
          </div>
        </div>

        {/* Preset Searches */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
            {t('viewer_preset_label')}
          </span>

          {file.path && file.path.toLowerCase().includes('icslog') ? (
            <>
              <button
                className="btn-preset badge-level err"
                onClick={() => { setSearchTerm('(E)'); setShowFindAll(true); }}
              >
                {t('viewer_preset_err')} (E)
              </button>
              <button
                className="btn-preset badge-level wrn"
                onClick={() => { setSearchTerm('(W)'); setShowFindAll(true); }}
              >
                {t('viewer_preset_wrn')} (W)
              </button>
              <button
                className="btn-preset"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                onClick={() => { setSearchTerm('AlertManager raised an alarm [level'); setShowFindAll(true); }}
              >
                🚨 {t('viewer_preset_alarms')}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-preset badge-level err"
                onClick={() => { setSearchTerm('[ERR]'); setShowFindAll(true); }}
              >
                {t('viewer_preset_err')} [ERR]
              </button>
              <button
                className="btn-preset badge-level wrn"
                onClick={() => { setSearchTerm('[WRN]'); setShowFindAll(true); }}
              >
                {t('viewer_preset_wrn')} [WRN]
              </button>
            </>
          )}

          {searchTerm && (
            <button
              className="btn-preset"
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: 10 }}
              onClick={() => { setSearchTerm(''); setShowFindAll(false); }}
            >
              {t('viewer_reset_search')}
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
          <span style={{ color: 'var(--text-muted)' }}>{t('viewer_open_file')}:</span> {fileName}
        </div>
      </div>

      {/* 3. Log Content & Results Panel */}
      <div className="viewer-layout">
        <div className="viewer-main">
          <div className="viewer-body-shell">
            {/* Virtualized Content */}
            <div className="viewer-content" ref={viewerRef} onScroll={handleScroll}>
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  minWidth: '100%',
                  width: 'max-content',
                  transform: `translateY(${startIndex * rowHeight}px)`
                }}>
                  {visibleLines.map((l) => (
                    <div
                      key={l.index}
                      className={`viewer-row ${highlightedLine === l.index ? 'highlighted' : ''}`}
                      style={{
                        background: l.highlights ? 'rgba(245, 158, 11, 0.15)' : (highlightedLine === l.index ? 'rgba(var(--accent-rgb), 0.3)' : 'transparent'),
                      }}
                      dangerouslySetInnerHTML={{ __html: l.content || '&nbsp;' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {showFindAll && (
              <div className="find-all-panel">
                <div className="panel-header">
                  <span>{t('viewer_results_count', { count: results.length })}</span>
                  <button className="close-btn" onClick={() => setShowFindAll(false)}>&times;</button>
                </div>
                <div className="panel-results">
                  {results.length === 0 ? (
                    <div className="empty-results">{t('viewer_no_results')}</div>
                  ) : (
                    results.map((res, i) => (
                      <div key={i} className="result-card" onClick={() => handleJumpToLine(res.lineNum)}>
                        <div className="result-card-header">
                          <span className={`badge-level ${res.level.toLowerCase()}`}>{res.level}</span>
                          <span className="result-timestamp">{res.timestamp}</span>
                          <span className="result-line-num">  {t('viewer_line_num', { num: res.lineNum + 1 })}</span>
                        </div>
                        <div className="result-line-content">{res.line}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function highlightLine(line) {
  // Simple highlight for now
  return line
    .replace(/\[ERR\]/g, '<span class="badge-level err">[ERR]</span>')
    .replace(/\[WRN\]/g, '<span class="badge-level wrn">[WRN]</span>')
    .replace(/\(E\)/g, '<span class="badge-level err">(E)</span>')
    .replace(/\(W\)/g, '<span class="badge-level wrn">(W)</span>');
}
