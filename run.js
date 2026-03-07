// Run script for Replit deployment.
// Starts the compiled Go backend binary.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting server...');

const serverPath = path.join(__dirname, 'backend', 'server');
const backendDir = path.join(__dirname, 'backend');

if (!fs.existsSync(serverPath)) {
  console.error(`Compiled backend binary not found at ${serverPath}`);
  console.error('Run the deployment build step before starting the app.');
  process.exit(1);
}

const server = spawn(serverPath, [], {
  stdio: 'inherit',
  cwd: backendDir,
  env: { ...process.env },
});

server.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Server exited due to signal ${signal}`);
    process.exit(1);
  }

  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 1);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Stopping server...');
  server.kill('SIGTERM');
});

console.log(`Server process started from ${serverPath}`);
