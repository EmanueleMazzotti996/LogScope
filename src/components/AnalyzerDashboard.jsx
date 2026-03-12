import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AnalyzerDashboard({ fileContent, fileName, onJumpToLine, eventMap }) {
    const { t, locale } = useLanguage();
    const [showAlarms, setShowAlarms] = useState(true); // Mostra di default per visibilità immediata
    const [showOperations, setShowOperations] = useState(true); // Mostra di default per Server Lib
    const [sortOps, setSortOps] = useState('count'); // 'count' o 'duration'
    const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(true); // Anomalie di default
    const analysis = useMemo(() => {
        try {
            if (!fileContent) return null;
            
            // Protezione file enormi: oltre 10MB non analizziamo (solo testo)
            if (fileContent.length > 10 * 1024 * 1024) {
                return { error: t('analysis_err_too_large') };
            }

            const lines = fileContent.split('\n');
            const restarts = [];
            const offlineEvents = [];
            const alarmsMap = {};
            const operationsMap = {}; // Aggrega durate processi
            const pendingOperations = {}; // { processName: startTimeMs }
            
            const nameLower = (fileName || '').toLowerCase();
            let isServerLib = nameLower.includes('serverlibrary') || 
                               nameLower.includes('serverlib') || 
                               nameLower.includes('server_library');
            
            // Fallback: Riconoscimento per formato timestamp [YYYY-MM-DD
            if (!isServerLib) {
                for (let j = 0; j < Math.min(lines.length, 20); j++) {
                    if (lines[j] && lines[j].match(/^\[\d{4}-\d{2}-\d{2}/)) {
                        isServerLib = true;
                        break;
                    }
                }
            }
            
            console.log(`[DEBUG] Final isServerLib: ${isServerLib}`);
            let computerName = t('unknown');
            let abacoVersion = t('unknown');
            let logDate = null;

            // Limitiamo l'analisi alle prime 100.000 righe per sicurezza
            const maxLines = Math.min(lines.length, 100000);
            for (let i = 0; i < maxLines; i++) {
                const line = lines[i];

                // Detect first valid date if not found yet
                if (!logDate) {
                    const tsMatch = line.match(/\[(\d{1,2}\/\d{1,2}\/\d{2,4} \d{2}:\d{2}:\d{2})\]|\[(\d{4}-\d{2}-\d{2} \d{2}[:\.]\d{2}[:\.]\d{2})\]/);
                    if (tsMatch) {
                        const rawDate = tsMatch[1] || tsMatch[2];
                        try {
                            // Extract just the date part
                            const datePart = rawDate.split(' ')[0];
                            const d = new Date(datePart.includes('/') ? datePart : datePart.replace(/\./g, '-'));
                            if (!isNaN(d.getTime())) {
                                logDate = d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
                            }
                        } catch (e) {
                            // Ignore date parsing errors
                        }
                    }
                }
                if (!line || line.length < 5) continue;

                // Analisi Lotti Prodotti
                if (line.toLowerCase().includes('commitchangestatus lot')) {
                    const match = line.match(/CommitChangeStatus Lot\s+['"]?([^'"]+)['"]?\s+result:\s+['"]?([^'"]+)['"]?/i);
                    if (match && match[1]) {
                        const lotId = match[1];
                        const lotResult = match[2] || 'UNKNOWN';
                        
                        if (!alarmsMap[`lot_${lotId}`]) {
                            alarmsMap[`lot_${lotId}`] = {
                                id: lotId,
                                count: 0,
                                hasError: false,
                                lastLineIndex: i
                            };
                        }
                        
                        const lotData = alarmsMap[`lot_${lotId}`];
                        lotData.count++;
                        if (lotResult.toUpperCase() !== 'OK') {
                            lotData.hasError = true;
                        }
                        lotData.lastLineIndex = i; 
                    }
                }

                // Cerca "ABACO Release :" (Principalmente per ICS, o se Server Lib non ha LOG START)
                if (line.includes('ABACO Release')) {
                    const match = line.match(/ABACO Release\s*:\s*(.+)/i);
                    if (match) {
                        abacoVersion = match[1].trim();
                        // Se abbiamo già un boot molto vicino (es. LOG START della Server Lib), saltiamo questo
                        const isDuplicate = restarts.some(r => Math.abs(r.lineIndex - i) < 100);
                        if (!isDuplicate) {
                            let dateBoot = t('unknown');
                            for (let j = i; j < Math.min(i + 15, lines.length); j++) {
                                const tsMatch = lines[j]?.match(/\[(\d{1,2}\/\d{1,2}\/\d{2,4} \d{2}:\d{2}:\d{2})\]|\[(\d{4}-\d{2}-\d{2} \d{2}[:\.]\d{2}[:\.]\d{2})\]/);
                                if (tsMatch) {
                                    dateBoot = tsMatch[1] || tsMatch[2];
                                    break;
                                }
                            }
                            restarts.push({ lineIndex: i, version: abacoVersion, dateBoot, type: 'release' });
                        }
                    }
                }

                // Cerca "Computer Name :"
                if (line.includes('Computer Name')) {
                    const match = line.match(/Computer Name\s*:\s*(.+)/i);
                    if (match) {
                        computerName = match[1].trim();
                        if (restarts.length > 0) {
                            restarts[restarts.length - 1].computerName = computerName;
                        }
                    }
                }

                // Rilevamento Boot Server Library (LOG START)
                if (isServerLib && line.includes('LOG START')) {
                    // Se abbiamo già un boot molto vicino (es. ABACO Release), lo consideriamo lo stesso
                    const isDuplicate = restarts.some(r => Math.abs(r.lineIndex - i) < 100);
                    if (!isDuplicate) {
                        const timeMatch = line.match(/^\[([^\]]+)\]/);
                        if (timeMatch) {
                            const dateBoot = timeMatch[1];
                            restarts.push({ 
                                lineIndex: i, 
                                version: abacoVersion, 
                                dateBoot, 
                                type: 'log_start' 
                            });
                        }
                    }
                }

                // Rilevamento Offline (Server Library)
                if (isServerLib && line.includes('Client Switch to OFFLINE')) {
                    const timeMatch = line.match(/^\[([^\]]+)\]/);
                    if (timeMatch) {
                        offlineEvents.push({
                            lineIndex: i,
                            time: timeMatch[1]
                        });
                    }
                }

                // Analisi Durata Processi (Più precisa: cerchiamo [DBG] BEGIN e [DBG] END)
                if (isServerLib) {
                    const dbgMatch = line.match(/\[DBG\]\s+(BEGIN|END)\s+/i);
                    const timeMatch = line.match(/^\[([^\]]+)\]/); // Prendi il primo timestamp in brackets

                    if (dbgMatch && timeMatch) {
                        const timeStr = timeMatch[1];
                        const type = dbgMatch[1].toUpperCase();
                        // Prendi tutto quello che c'è dopo BEGIN/END
                        const processNameRaw = line.split(dbgMatch[0])[1];
                        const processName = processNameRaw ? processNameRaw.trim() : null;

                        if (processName) {
                            const groupName = processName.split('::')[0]?.split('.').pop() || 'General';
                            // Pulizia timestamp per Date()
                            const normalizedTime = timeStr.replace(/\./g, ':').replace(' ', 'T');
                            const timestamp = new Date(normalizedTime).getTime();

                            if (!operationsMap[processName]) {
                                operationsMap[processName] = {
                                    name: processName.split('::').pop() || processName,
                                    fullName: processName,
                                    group: groupName,
                                    count: 0,
                                    failedCount: 0,
                                    totalDuration: 0,
                                    maxDuration: 0,
                                    durations: [],
                                    firstLineIndex: i
                                };
                            }

                            if (!isNaN(timestamp)) {
                                if (type === 'BEGIN') {
                                    pendingOperations[processName] = timestamp;
                                } else if (type === 'END' && pendingOperations[processName] !== undefined) {
                                    const startTime = pendingOperations[processName];
                                    const duration = Math.max(0, timestamp - startTime);
                                    const opStats = operationsMap[processName];
                                    opStats.count++;
                                    opStats.totalDuration += duration;
                                    opStats.durations.push(duration);
                                    if (duration > opStats.maxDuration) opStats.maxDuration = duration;
                                    delete pendingOperations[processName];
                                }
                            }
                        }
                    }
                }

                // Analisi Allarmi
                if (line.includes('AlertManager raised an alarm')) {
                    const match = line.match(/\[level=([^,]+),\s*id=([^,]+),\s*sheet=([^\]]+)\]/i);
                    if (match) {
                        const id = match[2]?.trim();
                        const level = match[1]?.trim();
                        const sheet = match[3]?.trim();
                        if (!id) continue;

                        if (!alarmsMap[id]) {
                            const eventNames = t('event_names') || {};
                            const eventDescs = t('event_descriptions') || {};
                            const eventInfo = (eventMap && eventMap[id]) || { eventName: id, labelDescription: '' };
                            const mainTitle = eventInfo.eventName;
                            const translatedDesc = t(mainTitle);
                            alarmsMap[id] = {
                                id: id,
                                level: (level || 'NORMAL').toUpperCase(),
                                eventName: mainTitle, // Titolo: Codice Evento
                                description: translatedDesc !== mainTitle ? translatedDesc : (eventInfo.labelDescription || eventInfo.description || ''),
                                count: 0,
                                sheets: new Set(),
                                firstLineIndex: i
                            };
                        }
                        alarmsMap[id].count++;
                        if (sheet && sheet.trim() !== '0') {
                            alarmsMap[id].sheets.add(sheet);
                        }
                    }
                }
            }

            Object.keys(pendingOperations).forEach(processName => {
                if (operationsMap[processName]) {
                    operationsMap[processName].failedCount++;
                }
            });

            const alarms = [];
            const lotsList = [];
            Object.keys(alarmsMap).forEach(key => {
                if (key.startsWith('lot_')) {
                    lotsList.push(alarmsMap[key]);
                } else {
                    alarms.push(alarmsMap[key]);
                }
            });

            const operationsList = Object.values(operationsMap);
            alarms.sort((a, b) => b.count - a.count);
            lotsList.sort((a, b) => b.id.localeCompare(a.id));
            operationsList.sort((a, b) => b.count - a.count);

            // Raggruppa per giorno per individuare restart multipli sullo stesso giorno
            const bootsByDay = {};
            restarts.forEach(r => {
                if (!r.dateBoot || r.dateBoot === t('unknown')) return;
                const dayMatch = r.dateBoot.match(/^(\d{2}\/\d{2}\/\d{2})|^(\d{4}-\d{2}-\d{2})/);
                const dateOnly = dayMatch ? (dayMatch[1] || dayMatch[2]) : r.dateBoot;
                if (!bootsByDay[dateOnly]) bootsByDay[dateOnly] = [];
                bootsByDay[dateOnly].push(r.dateBoot);
            });

            const multiBootAnomalies = Object.keys(bootsByDay)
                .filter(day => bootsByDay[day].length > 1)
                .map(day => ({
                    date: day,
                    times: bootsByDay[day]
                }));

            return {
                abacoVersion,
                computerName,
                restarts,
                alarms,
                alarmCount: alarms.filter(a => a.level?.toUpperCase()?.includes('ALERT')).reduce((acc, a) => acc + a.count, 0),
                warningCount: alarms.filter(a => a.level?.toUpperCase()?.includes('WARNING')).reduce((acc, a) => acc + a.count, 0),
                normalCount: alarms.filter(a => a.level && !a.level.toUpperCase()?.includes('ALERT') && !a.level.toUpperCase()?.includes('WARNING')).reduce((acc, a) => acc + a.count, 0),
                lots: lotsList,
                operations: operationsList,
                isWarning: restarts.length > 1 || offlineEvents.length > 0,
                hasCriticalAlarms: alarms.some(a => a.level?.toUpperCase()?.includes('ALERT')),
                multiBootAnomalies,
                offlineEvents,
                hasLotAnomaly: lotsList.some(l => l.hasError),
                isServerLib,
                displayDate: logDate
            };
        } catch (error) {
            console.error("Critical error in AnalyzerDashboard analysis:", error);
            return { error: error.message };
        }
    }, [fileContent, eventMap, fileName]);

    if (!analysis) return null;

    if (analysis && analysis.error) {
        return (
            <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>ℹ️</span>
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--warning)' }}>{t('analysis_limited')}</h4>
                        <p style={{ fontSize: '12px', margin: '4px 0 0 0', opacity: 0.8 }}>{analysis.error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className={`analyzer-dashboard ${(analysis.isWarning || analysis.hasLotAnomaly) ? 'warning-active' : ''}`}>
            <div className="dashboard-header">
                <h2>{t('analysis_header_small')} <span className={`badge ${analysis.isServerLib ? 'server' : ''}`}>{analysis.isServerLib ? 'Server Lib' : 'ICS Log'}</span></h2>
            </div>

            {/* Alert Offline Critico */}
            {analysis.offlineEvents && analysis.offlineEvents.length > 0 && (
                <div className="card" style={{ borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)', marginBottom: '16px', animation: 'pulse-red 2s infinite' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '24px' }}>🛑</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: '#fca5a5', fontSize: '15px' }}>{t('analysis_offline_detected')}</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                                {t('analysis_offline_desc', { count: analysis.offlineEvents.length })}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
                            {analysis.offlineEvents.map((evt, idx) => (
                                <span key={idx} className="badge-level err" style={{ 
                                    fontSize: '14px', 
                                    padding: '6px 12px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer', 
                                    background: 'rgba(239, 68, 68, 0.4)', 
                                    border: '1px solid rgba(239, 68, 68, 0.6)',
                                    borderRadius: '6px'
                                }} onClick={() => onJumpToLine(evt.lineIndex)}>
                                    {evt.time}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-stats">
                {analysis.displayDate && (
                    <div className="stat-box">
                        <span className="stat-label">{t('stat_log_date')}</span>
                        <span className="stat-value">{analysis.displayDate}</span>
                    </div>
                )}
                {!analysis.isServerLib && (
                    <>
                        <div className="stat-box">
                            <span className="stat-label">{t('stat_computer_name')}</span>
                            <span className="stat-value">{analysis.computerName}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">{t('stat_version')}</span>
                            <span className="stat-value">{analysis.abacoVersion}</span>
                        </div>
                    </>
                )}
                {analysis.lots.length > 0 && (
                    <div className={`stat-box safe`}>
                        <span className="stat-label">{t('stat_lots')}</span>
                        <span className="stat-value">{analysis.lots.length}</span>
                    </div>
                )}
                {!analysis.isServerLib && (
                    <div className={`stat-box ${analysis.restarts.length > 1 ? 'danger' : 'safe'}`}>
                        <span className="stat-label">{t('stat_restarts')}</span>
                        <span className="stat-value">{analysis.restarts.length}</span>
                    </div>
                )}
            </div>


            {analysis.hasLotAnomaly && (
                <div className="dashboard-alert warning-pulse">
                    <div className="alert-icon">⚡</div>
                    <div className="alert-content">
                        <strong>{t('analysis_compliance_header')}</strong> {t('analysis_compliance_desc')}
                    </div>
                </div>
            )}


            {analysis.restarts.length > 0 && (
                <div className={`dashboard-restarts-prose ${(analysis.restarts.length > 1 || analysis.multiBootAnomalies) ? 'danger' : 'safe'}`} style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border)',
                    background: (analysis.restarts.length > 1 || analysis.multiBootAnomalies) ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.03)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-secondary)'
                }}>
                    {analysis.restarts.length === 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🚀</span>
                            <span>{t('analysis_boot_first', { time: analysis.restarts[0].dateBoot })}</span>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '18px', marginTop: '2px' }}>⚠️</span>
                                <span>
                                    {t('analysis_boot_multi', { 
                                        time: analysis.restarts[0].dateBoot, 
                                        count: analysis.restarts.length - 1 
                                    })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '28px' }}>
                                {analysis.restarts.slice(1).map((r, idx) => (
                                    <button
                                        key={idx}
                                        className="jump-btn"
                                        style={{ 
                                            padding: '4px 12px', 
                                            fontSize: '13px', 
                                            borderRadius: '6px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#fca5a5',
                                            fontWeight: '600'
                                        }}
                                        onClick={() => onJumpToLine(r.lineIndex)}
                                    >
                                        {r.dateBoot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {analysis.lots.length > 0 && (
                <div className="dashboard-lots">
                    <h4>{t('stat_lots')}:</h4>
                    <div className="jump-chips lots">
                        {analysis.lots.map((lot, idx) => (
                            <button
                                key={idx}
                                className={`jump-btn lot-chip ${lot.hasError ? 'err' : 'ok'}`}
                                onClick={() => onJumpToLine(lot.lastLineIndex)}
                            >
                                <span className="lot-icon">📦</span>
                                <span className="lot-id">{lot.id}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {analysis.alarms.length > 0 && (
                <div className="dashboard-events">
                    <div className="section-header-toggle" onClick={() => setShowAlarms(!showAlarms)}>
                        <div className="report-title-group">
                            <h4>{t('analysis_abaco_report')}</h4>
                            {!showAlarms && (
                                <div className="event-summary-mini">
                                    {analysis.alarmCount > 0 && <span className="summary-count alarm">{t('analysis_count_alarms', { count: analysis.alarmCount })}</span>}
                                    {analysis.warningCount > 0 && <span className="summary-count warning">{t('analysis_count_warnings', { count: analysis.warningCount })}</span>}
                                    {analysis.normalCount > 0 && <span className="summary-count normal">{t('analysis_count_normal', { count: analysis.normalCount })}</span>}
                                </div>
                            )}
                        </div>
                        <button className="btn-toggle-report">
                            {showAlarms ? t('hide_report') : t('show_report')}
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" 
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: showAlarms ? 'rotate(180deg)' : 'rotate(0)' }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>
                    
                    {showAlarms && (
                        <div className="grouped-events-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {[
                                { title: t('group_alert'), level: 'ALERT', color: '#ef4444', columns: 2 },
                                { title: t('group_warning'), level: 'WARNING', color: '#f59e0b', columns: 2 },
                                { title: t('group_normal'), level: 'NORMAL', color: '#06b6d4', columns: 1 }
                            ].map(group => {
                                const filtered = analysis.alarms.filter(a => a.level.includes(group.level));
                                if (filtered.length === 0) return null;
                                const totalOccurrences = filtered.reduce((sum, a) => sum + (a.count || 0), 0);
                                return (
                                    <div key={group.level} className="event-group-section" style={{ marginBottom: '10px' }}>
                                        <h5 style={{ color: group.color, marginBottom: '10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {group.title} ({totalOccurrences})
                                        </h5>
                                        <div className={group.columns === 2 ? "events-grid compact" : "events-grid"}>
                                            {filtered.map((alarm, idx) => (
                                                <div key={idx} className={`event-tile level-${alarm.level.toLowerCase()}`} onClick={() => onJumpToLine(alarm.firstLineIndex)}>
                                                    <div className="event-main-row">
                                                        <div className="event-id-group">
                                                            <span className="event-name-large">{alarm.eventName}</span>
                                                            <span className="event-id-small">ID {alarm.id}</span>
                                                        </div>
                                                        <span className="event-count-large">x{alarm.count}</span>
                                                    </div>
                                                    {alarm.description && (
                                                       <div className="event-description-box" style={{ marginTop: '8px', fontSize: '11px', opacity: 0.7, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                                                           {alarm.description}
                                                       </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Fissato in basso su richiesta */}
            {analysis && analysis.isServerLib && (
                <div className="dashboard-lots" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div className="section-header-toggle" onClick={() => setShowOperations(!showOperations)}>
                        <h4 style={{ margin: 0 }}>{t('analysis_server_lib_stats')}</h4>
                        <button className="btn-toggle-report">
                            {showOperations ? t('hide_report') : t('show_report')}
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" 
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: showOperations ? 'rotate(180deg)' : 'rotate(0)' }}
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>
                    
                     {showOperations && (
                        <>
                            {analysis.operations && analysis.operations.length > 0 ? (
                                <>
                                    <div style={{ marginBottom: '14px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-light)', opacity: 0.9 }}>
                                        {analysis.operations.length > 0 ? t('analysis_ops_found', { count: analysis.operations.length }) : t('analysis_no_ops')}
                                    </div>
                                    <div className="filter-chips" style={{ marginBottom: '16px', justifyContent: 'flex-start', gap: '8px' }}>
                                        <div className="toggle-group-premium">
                                            <button 
                                                className={`toggle-btn-premium ${showOnlyAnomalies ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); setShowOnlyAnomalies(true); }}
                                            >
                                                {t('anomalies')}
                                            </button>
                                            <button 
                                                className={`toggle-btn-premium ${!showOnlyAnomalies ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); setShowOnlyAnomalies(false); }}
                                            >
                                                {t('all')}
                                            </button>
                                        </div>
                                        
                                        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>
                                        
                                        <button 
                                            className={`filter-chip ${sortOps === 'count' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); setSortOps('count'); }}
                                        >
                                            {t('sort_frequency')}
                                        </button>
                                        <button 
                                            className={`filter-chip ${sortOps === 'duration' ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); setSortOps('duration'); }}
                                        >
                                            {t('sort_duration')}
                                        </button>
                                    </div>
                                    <div className="process-grid-quad">
                                        {[...analysis.operations]
                                          .filter(op => {
                                            if (!showOnlyAnomalies) return true;
                                            // Anomalia: fallimento oppure durata max > 60s
                                            return op.failedCount > 0 || op.maxDuration > 60000;
                                          })
                                          .sort((a, b) => {
                                            if (sortOps === 'count') return b.count - a.count;
                                            const avgA = a.count > 0 ? a.totalDuration / a.count : 0;
                                            const avgB = b.count > 0 ? b.totalDuration / b.count : 0;
                                            return avgB - avgA;
                                        }).map((op, idx) => {
                                            if (!op) return null;
                                            const avgMs = op.count > 0 ? (op.totalDuration / op.count) : 0;
                                            const formatTime = (ms) => ms === 0 ? '< 1s' : `${(ms / 1000).toFixed(2)}s`;
                                        
                                        // Genera un colore hash basato sul gruppo
                                        let hash = 0;
                                        for (let i = 0; i < op.group.length; i++) {
                                            hash = op.group.charCodeAt(i) + ((hash << 5) - hash);
                                        }
                                        const hue = Math.abs(hash % 360);
                                        const groupColor = `hsl(${hue}, 60%, 65%)`;

                                        return (
                                            <div key={idx} className={`event-tile process-tile ${op.failedCount > 0 ? 'level-err' : ''}`} 
                                                 style={{ borderLeftColor: groupColor }}
                                                 onClick={() => onJumpToLine(op.firstLineIndex)}>
                                                <div className="process-group-label" style={{ color: groupColor }}>{op.group || t('stat_general')}</div>
                                                <div className="event-main-row" style={{ alignItems: 'flex-end', marginBottom: '2px' }}>
                                                    <div className="event-id-group">
                                                        <span className="process-name-text" title={op.fullName}>{op.name}</span>
                                                    </div>
                                                    <div className="process-count-mini">x{op.count}</div>
                                                </div>
                                                <div className="process-stats-row">
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <span>{formatTime(avgMs)}</span>
                                                        <span style={{ opacity: 0.5 }}>Mx: {formatTime(op.maxDuration)}</span>
                                                    </div>
                                                    {op.failedCount > 0 && (
                                                        <span className="process-failed-tag">
                                                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                 <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                                             </svg>
                                                             {t('analysis_ops_failed', { count: op.failedCount })}
                                                         </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px', border: '1px dashed var(--border)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', width: '100%' }}>
                                    {t('analysis_no_ops_found')}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

        </div>
    );
}
