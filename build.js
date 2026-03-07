// Build script for Replit deployment
// Builds both the Go backend and the Vite frontend

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build...');

try {
  // Build Go backend
  console.log('📦 Building Go backend...');
  execSync('cd backend && go build -o server ./cmd/server', { 
    stdio: 'inherit',
    env: { ...process.env, GO111MODULE: 'on' }
  });
  console.log('✅ Go backend built successfully');

  // Build frontend
  console.log('📦 Building frontend...');
  if (fs.existsSync('frontend')) {
    execSync('cd frontend && npm install && npm run build', { 
      stdio: 'inherit'
    });
    console.log('✅ Frontend built successfully');
  }

  console.log('🎉 Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
