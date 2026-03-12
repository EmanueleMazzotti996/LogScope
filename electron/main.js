const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'GODLOG - Abaco Server Log Analyzer',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    backgroundColor: '#0a0e1a',
    show: false, // Don't show until ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // mainWindow.webContents.openDevTools(); // Disabilitato per avvio pulito
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// ─── IPC Handlers ────────────────────────────────────────────────

// Browse for folder
ipcMain.handle('browse-folder', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Seleziona cartella',
    properties: ['openDirectory'],
    defaultPath: options?.defaultPath || undefined,
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Get app root path
// Get app root path for internal assets
ipcMain.handle('get-app-path', async () => {
  return isDev ? process.cwd() : app.getAppPath();
});

// Robust Event Mapping Retrieval
ipcMain.handle('get-event-mapping', async () => {
  try {
    const appPath = isDev ? process.cwd() : app.getAppPath();
    const csvPath = path.join(appPath, 'public', 'eventmap_detailed_edit.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error("Mapping file not found at:", csvPath);
      return { error: "Mapping file missing" };
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    return { content };
  } catch (err) {
    return { error: err.message };
  }
});

// Scan available dates and clients from the source root
ipcMain.handle('scan-source', async (event, sourceRoot) => {
  const result = { dates: [], clients: new Set() };

  try {
    if (!fs.existsSync(sourceRoot)) {
      return { error: `Percorso non trovato: ${sourceRoot}`, dates: [], clients: [] };
    }

    const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });
    // Accetta sia il formato YYYY-MM-DD rigoroso che un formato testuale più ampio
    const dateRegex = /^(\d{4}-\d{2}-\d{2}|[A-Za-z0-9_.-]+)$/;

    for (const entry of entries) {
      if (entry.isDirectory() && dateRegex.test(entry.name)) {
        result.dates.push(entry.name);

        const datePath = path.join(sourceRoot, entry.name);
        try {
          const clientEntries = fs.readdirSync(datePath, { withFileTypes: true });
          for (const clientEntry of clientEntries) {
            if (clientEntry.isDirectory()) {
              result.clients.add(clientEntry.name);
            }
          }
        } catch (e) {
          // Ignore unreadable date directories
        }
      }
    }

    result.dates.sort().reverse();
    return { dates: result.dates, clients: [...result.clients].sort() };
  } catch (err) {
    return { error: err.message, dates: [], clients: [] };
  }
});

// Extract logs — core functionality
ipcMain.handle('extract-logs', async (event, { sourceRoot, destination, dates, clients, logFiles }) => {
  const results = [];
  const LOG_FILES = logFiles || ['icslog.txt', 'serverlibrarylog.txt'];

  try {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const totalOps = dates.length * clients.length * LOG_FILES.length;
    let completed = 0;

    for (const date of dates) {
      for (const client of clients) {
        // Cerca prima nella cartella 'logs', altrimenti direttamente nella cartella del client
        let logsPath = path.join(sourceRoot, date, client, 'logs');
        if (!fs.existsSync(logsPath)) {
          logsPath = path.join(sourceRoot, date, client);
        }

        if (!fs.existsSync(logsPath)) {
          results.push({
            date, client, file: '*', status: 'warning',
            message: `Percorso non trovato: ${path.join(sourceRoot, date, client)}`,
          });
          completed += LOG_FILES.length;
          mainWindow.webContents.send('extraction-progress', { completed, total: totalOps });
          continue;
        }

        for (const logFile of LOG_FILES) {
          const srcFile = path.join(logsPath, logFile);
          const newName = `${date}_${client}_${logFile}`;
          const destFile = path.join(destination, newName);

          if (fs.existsSync(srcFile)) {
            try {
              fs.copyFileSync(srcFile, destFile);
              const stats = fs.statSync(destFile);
              results.push({
                date, client, file: logFile, newName,
                status: 'success', message: `Copiato: ${newName}`, size: stats.size,
              });
            } catch (copyErr) {
              results.push({
                date, client, file: logFile, status: 'error',
                message: `Errore copia: ${copyErr.message}`,
              });
            }
          } else {
            results.push({
              date, client, file: logFile, status: 'not_found',
              message: `File non trovato: ${srcFile}`,
            });
          }

          completed++;
          mainWindow.webContents.send('extraction-progress', { completed, total: totalOps });
        }
      }
    }

    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message, results };
  }
});

// Read a log file for the viewer
ipcMain.handle('read-log-file', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    // Limit to 30MB to ensure renderer stability during analysis
    if (stats.size > 30 * 1024 * 1024) {
      return {
        error: "Il file è troppo grande (>30MB). Per favore usa un editor esterno (es. Notepad++) per file di queste dimensioni.",
        size: stats.size
      };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      content,
      size: stats.size,
      truncated: false,
    };
  } catch (err) {
    return { error: err.message };
  }
});

// List extracted files in destination
ipcMain.handle('list-extracted-files', async (event, destination) => {
  try {
    if (!fs.existsSync(destination)) return [];

    const results = [];
    const maxFiles = 1000;

    function walk(dir) {
      if (results.length >= maxFiles) return;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (results.length >= maxFiles) break;
        const fullPath = path.join(dir, f);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          walk(fullPath);
        } else if (f.endsWith('.txt')) {
          // Smart extraction from content
          let clientName = 'Sconosciuto';
          let logDate = 'Sconosciuta';
          let abacoVersion = '';

          try {
            // Read first 64KB to find metadata (ServerLibrary metadata can be deep)
            const fd = fs.openSync(fullPath, 'r');
            const buffer = Buffer.alloc(65536);
            const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
            fs.closeSync(fd);

            const head = buffer.toString('utf8', 0, bytesRead);

            // Regex for Computer Name (icslog format)
            const clientMatch = head.match(/Computer Name\s*:\s*([^\r\n]+)/i);
            // Regex for ClientTag (found in ServerLibraryLog)
            const clientTagMatch = head.match(/ClientTag\s*=\s*([^\r\n;]+)/i);
            // Regex for trace_ora_ (older ServerLibraryLog)
            const traceMatch = head.match(/trace_ora_([A-Za-z0-9\-]+)/i);
            // Regex for IN_CLIENT_TAG (fallback mentioned by user)
            const sqlClientMatch = head.match(/IN_CLIENT_TAG['\s]*=['\s]*'([^']+)'/i);

            if (clientMatch) {
              clientName = clientMatch[1].trim();
            } else if (clientTagMatch) {
              clientName = clientTagMatch[1].trim();
            } else if (traceMatch) {
              clientName = traceMatch[1].trim();
            } else if (sqlClientMatch) {
              clientName = sqlClientMatch[1].trim();
            } else {
              // Regex for ServerLibraryLog format in path string: ...\data\YYYY-MM-DD\CLIENT\logs\...
              const serverLibMatch = head.match(/LOG FILE:\s+.*\\\d{4}-\d{2}-\d{2}\\([^\\]+)\\?/i);
              if (serverLibMatch) clientName = serverLibMatch[1].trim();
            }

            // Clean client name
            if (clientName) clientName = clientName.replace(/'/g, '');

            // Regex for ABACO Release
            const versionMatch = head.match(/ABACO Release\s*:\s*([^\r\n]+)/i);
            if (versionMatch) abacoVersion = versionMatch[1].trim();

            // Regex for Date: 
            // 1. [MM/DD/YY] as in icslog: [11/15/26 16:16:17]
            // 2. [YYYY-MM-DD] as in ServerLibrary: [2025-04-30 07.22.32]
            const dateMatch = head.match(/\[(\d{1,2}\/\d{1,2}\/\d{2,4})|\[(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              // dateMatch[1] is MM/DD/YY, dateMatch[2] is YYYY-MM-DD
              logDate = dateMatch[1] || dateMatch[2];
            }
          } catch (e) {
            console.error(`Error reading metadata from ${f}:`, e);
          }

          results.push({
            name: f,
            relativePath: path.relative(destination, fullPath),
            path: fullPath,
            size: stats.size,
            modified: stats.mtime,
            clientName,
            logDate,
            abacoVersion
          });
        }
      }
    }

    walk(destination);

    return results.sort((a, b) => b.modified - a.modified);
  } catch (err) {
    return { error: err.message };
  }
});
