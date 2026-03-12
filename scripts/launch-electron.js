// Helper script to launch Electron with the correct binary
const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

// Pass the project root so Electron reads package.json -> "main"
const projectRoot = path.join(__dirname, '..');

const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [projectRoot], {
    stdio: 'inherit',
    env: env
});

child.on('close', (code) => {
    process.exit(code);
});
