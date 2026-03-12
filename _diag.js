// Diagnostic: what does require('electron') actually return?
const electron = require('electron');
console.log('typeof electron:', typeof electron);
console.log('keys:', Object.keys(electron));
console.log('typeof app:', typeof electron.app);
console.log('typeof BrowserWindow:', typeof electron.BrowserWindow);
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);
console.log('process.versions.node:', process.versions.node);
if (electron.app) {
    electron.app.quit();
}
process.exit(0);
