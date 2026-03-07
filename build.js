// Build script for Replit deployment.
// Produces the Go backend binary and the frontend static bundle.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, options = {}) {
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env, GO111MODULE: 'on' },
    ...options,
  });
}

console.log('Starting build...');

try {
  console.log('Building Go backend...');
  run('go build -o server ./cmd/server', {
    cwd: path.join(__dirname, 'backend'),
  });
  console.log('Go backend built successfully');

  const frontendDir = path.join(__dirname, 'frontend');
  if (fs.existsSync(frontendDir)) {
    console.log('Building frontend...');

    const installCommand = fs.existsSync(path.join(frontendDir, 'package-lock.json'))
      ? 'npm ci'
      : 'npm install';

    run(installCommand, { cwd: frontendDir });
    run('npm run build', { cwd: frontendDir });
    console.log('Frontend built successfully');
  }

  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
