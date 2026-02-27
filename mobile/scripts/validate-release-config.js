const fs = require('fs');
const path = require('path');

const appConfigPath = path.join(__dirname, '..', 'app.json');
const androidManifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const appConfig = readJson(appConfigPath);
const expo = appConfig.expo || {};
const android = expo.android || {};
const permissions = android.permissions || [];

if (expo.name === 'mobile' || expo.slug === 'mobile') {
  fail('App identity is still generic (`name`/`slug`). Set final production branding in app.json.');
}

if (permissions.includes('SCHEDULE_EXACT_ALARM') || permissions.includes('USE_EXACT_ALARM')) {
  fail('Exact alarm permissions are present. Remove them unless explicitly required and policy-justified.');
}

const appJsonContent = fs.readFileSync(appConfigPath, 'utf8');
if (appJsonContent.includes('AIza')) {
  fail('Possible hardcoded API key found in app.json.');
}

if (fs.existsSync(androidManifestPath)) {
  const androidManifest = fs.readFileSync(androidManifestPath, 'utf8');
  if (androidManifest.includes('AIza')) {
    fail('Possible hardcoded Google Maps key found in AndroidManifest.xml.');
  }
}

if (!process.env.EXPO_PUBLIC_API_HOST) {
  warn('EXPO_PUBLIC_API_HOST is not set in current shell. Ensure it is set in EAS profile env.');
}

if (!process.env.MAPS_API_KEY && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
  warn('MAPS_API_KEY is not set in current shell. Ensure EAS secret/env is configured for production builds.');
}

if (process.exitCode) {
  console.error('\nRelease configuration check failed.');
  process.exit(process.exitCode);
}

console.log('Release configuration check passed.');
