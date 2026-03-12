import React from 'react';

const AboutTab = () => {
    return (
        <div className="page about-page">
            <div className="page-header">
                <h1>Guida</h1>
                <p className="page-desc">Manuale operativo per l'analisi avanzata dei log Abaco Server.</p>
            </div>

            <div className="about-grid-3">
                <div className="card about-card glass">
                    <div className="about-icon">📁</div>
                    <h3>Acquisizione Dati</h3>
                    <p>
                        I file possono essere caricati tramite <strong>importazione locale o estrazione automatica</strong> dai nodi. 
                        I log vengono organizzati per data e client per una consultazione immediata.
                    </p>
                </div>

                <div className="card about-card glass">
                    <div className="about-icon">📊</div>
                    <h3>Analisi</h3>
                    <p>
                        Dashboard diagnostica dedicata: per gli <strong>ICS Log</strong> identifica gli eventi di produzione; 
                        per la <strong>Server Library</strong> monitora le operazioni server e i tempi di risposta critici. 
                        Per entrambi è possibile rilevare un numero anomalo di avvii giornalieri.
                    </p>
                </div>

                <div className="card about-card glass">
                    <div className="about-icon">🧭</div>
                    <h3>Navigazione</h3>
                    <p>
                        Sincronizzazione tra Dashboard e file: l'interfaccia <strong>evidenzia le righe</strong> interessate 
                        e permette l'uso del <strong>"Find All"</strong> per isolare istantaneamente ogni occorrenza nel log.
                    </p>
                </div>
            </div>

            <footer className="about-footer">
                <p>© 2026 LogScope Analysis Suite — Technical Division.</p>
            </footer>
        </div>
    );
};

export default AboutTab;
