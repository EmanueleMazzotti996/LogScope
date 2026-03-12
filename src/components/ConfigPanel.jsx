import React, { useState, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ConfigPanel({ config, setConfig, onExtract, isExtracting, isElectron }) {
  const { t } = useLanguage();
  const [dateInput, setDateInput] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [scanError, setScanError] = useState(null);

  const handleBrowse = useCallback(async (field) => {
    if (!isElectron) return;
    const title = field === 'sourceRoot' ? t('config_source_title') : t('config_dest_title');
    const defaultPath = config[field] || undefined;
    const result = await window.godlog.browseFolder({ title, defaultPath });
    if (result) {
      setConfig((prev) => ({ ...prev, [field]: result }));
    }
  }, [config, setConfig, isElectron]);

  const handleScan = useCallback(async () => {
    if (!isElectron || !config.sourceRoot) return;
    setScanning(true);
    setScanError(null);
    try {
      const data = await window.godlog.scanSource(config.sourceRoot);
      if (data.error) {
        setScanError(data.error);
        setScanData(null);
      } else {
        setScanData(data);
        setScanError(null);
      }
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanning(false);
    }
  }, [config.sourceRoot, isElectron]);

  const addDate = useCallback((d) => {
    const trimmed = d.trim();
    if (trimmed && !config.dates.includes(trimmed)) {
      setConfig((prev) => ({ ...prev, dates: [...prev.dates, trimmed] }));
    }
    setDateInput('');
  }, [config.dates, setConfig]);

  const removeDate = (d) => {
    setConfig((prev) => ({ ...prev, dates: prev.dates.filter((x) => x !== d) }));
  };

  const addClient = useCallback((c) => {
    const trimmed = c.trim();
    if (trimmed && !config.clients.includes(trimmed)) {
      setConfig((prev) => ({ ...prev, clients: [...prev.clients, trimmed] }));
    }
    setClientInput('');
  }, [config.clients, setConfig]);

  const removeClient = (c) => {
    setConfig((prev) => ({ ...prev, clients: prev.clients.filter((x) => x !== c) }));
  };

  const handleDateKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDate(dateInput);
    }
  };

  const handleClientKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addClient(clientInput);
    }
  };

  const toggleScanDate = (d) => {
    if (config.dates.includes(d)) {
      removeDate(d);
    } else {
      setConfig((prev) => ({ ...prev, dates: [...prev.dates, d] }));
    }
  };

  const toggleScanClient = (c) => {
    if (config.clients.includes(c)) {
      removeClient(c);
    } else {
      setConfig((prev) => ({ ...prev, clients: [...prev.clients, c] }));
    }
  };

  const canExtract = config.dates.length > 0 && config.clients.length > 0 && config.destination;

  return (
    <>
      {!isElectron && (
        <div className="no-electron-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {t('config_no_electron')}
          <strong style={{ marginLeft: 4 }}>npm run electron:dev</strong>
        </div>
      )}

      {/* Source & Destination */}
      <div className="card">
        <div className="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          {t('config_paths')}
        </div>

        <div className="form-group">
          <label className="form-label">{t('config_source')}</label>
          <div className="form-row">
            <input
              type="text"
              className="form-input"
              value={config.sourceRoot}
              onChange={(e) => setConfig((prev) => ({ ...prev, sourceRoot: e.target.value }))}
              placeholder={t('config_source_placeholder')}
            />
            <button className="browse-btn" onClick={() => handleBrowse('sourceRoot')} disabled={!isElectron}>
              {t('browse')}
            </button>
            <button
              className="btn btn-scan btn-sm"
              onClick={handleScan}
              disabled={!isElectron || scanning || !config.sourceRoot}
            >
              {scanning ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> {t('scanning')}</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {t('scan')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('config_dest')}</label>
          <div className="form-row">
            <input
              type="text"
              className="form-input"
              value={config.destination}
              onChange={(e) => setConfig((prev) => ({ ...prev, destination: e.target.value }))}
              placeholder={t('config_dest_placeholder')}
            />
            <button className="browse-btn" onClick={() => handleBrowse('destination')} disabled={!isElectron}>
              {t('browse')}
            </button>
          </div>
        </div>

        {scanError && (
          <div className="result-item error" style={{ marginTop: 8 }}>
            <span className="result-icon">⚠</span>
            <span className="result-message">{scanError}</span>
          </div>
        )}

        {scanData && (
          <div className="scan-results">
            <div className="scan-column">
              <div className="scan-column-title">{t('config_scan_found_dates', { count: scanData.dates.length })}</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {scanData.dates.map((d) => (
                  <label key={d} className="scan-item">
                    <input
                      type="checkbox"
                      checked={config.dates.includes(d)}
                      onChange={() => toggleScanDate(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="scan-column">
              <div className="scan-column-title">{t('config_scan_found_clients', { count: scanData.clients.length })}</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {scanData.clients.map((c) => (
                  <label key={c} className="scan-item">
                    <input
                      type="checkbox"
                      checked={config.clients.includes(c)}
                      onChange={() => toggleScanClient(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dates & Clients */}
      <div className="card">
        <div className="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {t('config_dates_clients')}
        </div>

        <div className="form-group">
          <label className="form-label">{t('config_dates')}</label>
          <div className="form-row">
            <input
              type="text"
              className="form-input"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={handleDateKeyDown}
              placeholder={t('config_dates_placeholder')}
            />
            <button className="btn-icon" onClick={() => addDate(dateInput)} disabled={!dateInput.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div className="tags-container">
            {config.dates.map((d) => (
              <span key={d} className="tag">
                {d}
                <button className="tag-remove" onClick={() => removeDate(d)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('config_clients')}</label>
          <div className="form-row">
            <input
              type="text"
              className="form-input"
              value={clientInput}
              onChange={(e) => setClientInput(e.target.value)}
              onKeyDown={handleClientKeyDown}
              placeholder={t('config_clients_placeholder')}
            />
            <button className="btn-icon" onClick={() => addClient(clientInput)} disabled={!clientInput.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div className="tags-container">
            {config.clients.map((c) => (
              <span key={c} className="tag">
                {c}
                <button className="tag-remove" onClick={() => removeClient(c)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Extract Action */}
      <div className="extract-actions">
        <div className="extract-summary">
          {canExtract ? (
            t('config_ready', { 
              dates: config.dates.length, 
              clients: config.clients.length, 
              total: config.dates.length * config.clients.length * 2 
            })
          ) : (
            t('config_not_ready')
          )}
        </div>
        <button
          className="btn btn-extract"
          onClick={onExtract}
          disabled={!canExtract || isExtracting || !isElectron}
        >
          {isExtracting ? (
            <><span className="spinner" /> {t('extracting')}</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('extract')}
            </>
          )}
        </button>
      </div>
    </>
  );
}
