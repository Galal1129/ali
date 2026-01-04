const { spawn } = require('child_process');

console.log('Starting EAS build with automatic keystore generation...');

const proc = spawn('./node_modules/.bin/eas', ['build', '--platform', 'android', '--profile', 'production'], {
  env: { ...process.env, EXPO_TOKEN: 't67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo' },
  stdio: ['pipe', 'inherit', 'inherit']
});

let buffer = '';
let keystorePromptSent = false;

// Read stdout in chunks
const reader = setInterval(() => {
  // Auto-respond after delays
  if (!keystorePromptSent) {
    setTimeout(() => {
      console.log('\n>>> Auto-responding: Generate new keystore');
      try {
        proc.stdin.write('\n');
        keystorePromptSent = true;
      } catch (e) {
        console.error('Could not write to stdin:', e.message);
      }
    }, 8000);
  }
}, 1000);

proc.on('close', (code) => {
  clearInterval(reader);
  console.log(`\nBuild process exited with code ${code}`);
  process.exit(code);
});

proc.on('error', (err) => {
  clearInterval(reader);
  console.error('Process error:', err);
  process.exit(1);
});

// Timeout after 10 minutes
setTimeout(() => {
  clearInterval(reader);
  console.log('\nBuild timeout - still running in background');
}, 600000);

