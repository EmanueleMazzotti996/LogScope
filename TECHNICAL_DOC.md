# Parvis Loggy-Eye — Technical Documentation
**Advanced Abaco Server Log Diagnostic & Analysis Suite**
*Revision 1.0 | Project Lead: EM*

---

## 1. Project Overview
Parvis Loggy-Eye is a high-performance desktop application designed for handy analysis of Parvis systems logs (ICS Log & Server Library). It transforms raw, voluminous text logs into actionable insights through an intelligent diagnostic engine and a premium, responsive UI.

## 2. Technical Stack
- **Framework**: React 18.3 (Component-based architecture)
- **Runtime**: Electron 31.7 (Chromium/Node.js integration)
- **Build System**: Vite 6.2 (Next-gen frontend tooling)
- **Styling**: Vanilla CSS3 (Custom Glassmorphism Design System)
- **Packaging**: Electron-Builder (NSIS/Portable Windows targets)

## 3. Core Features & Diagnostic Intelligence

### 3.1 Advanced Diagnostic Engine (Analisi)
The "Analisi" dashboard performs real-time parsing to extract critical metadata:
- **System Boot Tracking**: Detects system starts via `LOG START` and `ABACO Release` patterns.
- **Deduplication Logic**: Intelligent matching between Server Library and ICS threads to provide accurate boot counts.
- **Daily Anomaly Detection**: Automatic "Danger" (Red) state activation for multiple reboots within the same 24h window.

### 3.2 Offline Blackout Monitoring
The system monitors for critical connectivity failures:
- **Pattern Matching**: Detects `!!!!! Client Switch to OFFLINE !!!!!` events.
- **Alert System**: High-priority pulsing UI notification with direct navigation to the timestamp of the blackout.

### 3.3 Operation Statistics (Server Library)
Specialized profiling for backend processes:
- **Duration Tracking**: Measures time between `[DBG] BEGIN` and `[DBG] END`.
- **Anomaly Filtering**: Direct toggle to isolate failed operations or those exceeding the **60-second** performance threshold.

### 3.4 Production Intelligence
- **Lot Tracking**: Identifies production lots.
- **Compliance Check**: Detects systematic anomalies in lot status changes (Production/Closed/Cancelled).

## 4. UI/UX Principles
- **Controlled Components**: 100% synchronization between search inputs and internal state filters.
- **Performance**: CSS-only splash screens and memoized file processing to prevent UI blocking. Support for large logs up to **30MB** for renderer stability.
- **Accessibility**: Smooth line-jumping for rapid forensic navigation directly within the log viewer.

## 5. Build & Deployment
The production EXE is not automatically updated during development. To generate a fresh entry for distribution:

1. **Clean Rebuild**:
   ```powershell
   npm run electron:build
   ```
2. **Output**: 
   The updated portable executable will be located in the `dist-electron/` directory:
   `Parvis-Loggy-Eye-1.0.0-portable.exe`

---
*© 2026 Parvis Loggy-Eye Project*
