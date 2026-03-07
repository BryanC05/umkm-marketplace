// Run script for Replit deployment
// Starts the Go backend server

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting server...');

const serverPath = path.join(__dirname, 'backend', 'server');

try {
  const server = spawn(serverPath, [], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'backend'),
    env: { ...process.env }
  });

  server.on('error', (err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });

  console.log('✅ Server started successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}
