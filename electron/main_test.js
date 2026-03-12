const electron = require('electron');
console.log('typeof electron:', typeof electron);
console.log('process.type:', process.type);
console.log('electron version:', process.versions.electron);
console.log('node version:', process.versions.node);
if (typeof electron === 'object' && electron.app) {
    console.log('app exists!');
    electron.app.quit();
} else if (typeof electron === 'string') {
    console.log('electron is a string (binary path):', electron);
} else {
    console.log('electron default export:', electron.default ? 'exists' : 'no');
    console.log('all exports:', JSON.stringify(Object.getOwnPropertyNames(electron)));
}
process.exit(0);
