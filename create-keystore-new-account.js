const { execSync } = require('child_process');

const EXPO_TOKEN = 'ZO6ucB1r6vpVhPc5JrxRqu86_Sbx21pAC1LmujwI';
const PROJECT_ID = 'e882c2a8-6dd9-459f-88da-b57f96684e6f';

console.log('Step 1: Creating keystore via EAS API...');

const createKeystoreCommand = `curl -X POST "https://api.expo.dev/v2/credentials/android/keystore" \\
  -H "Authorization: Bearer ${EXPO_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -H "Expo-Session: ${EXPO_TOKEN}" \\
  -d '{
    "projectId": "${PROJECT_ID}",
    "type": "jks"
  }'`;

try {
  const result = execSync(createKeystoreCommand, { encoding: 'utf-8' });
  console.log('Keystore creation response:', result);
} catch (error) {
  console.log('Note: Keystore might already exist or API call failed');
  console.log('Proceeding with build anyway...');
}

console.log('\nStep 2: Starting build with existing/new credentials...');

const buildCommand = `export EXPO_TOKEN="${EXPO_TOKEN}" && npx eas-cli build --platform android --profile preview --non-interactive`;

try {
  execSync(buildCommand, { stdio: 'inherit', shell: '/bin/bash' });
  console.log('\n✓ Build started successfully!');
} catch (error) {
  console.error('\n✗ Build failed');
  process.exit(1);
}
