const pkg = require('./node_modules/electron/package.json');
console.log('Electron package version:', pkg.version);
const electronPath = require('electron');
console.log('Electron binary path:', electronPath);
