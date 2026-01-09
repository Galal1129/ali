const { spawn } = require('child_process');

process.env.EXPO_TOKEN = 'ZO6ucB1r6vpVhPc5JrxRqu86_Sbx21pAC1LmujwI';

console.log('Starting EAS build with automatic responses...\n');

const child = spawn('npx', ['eas-cli', 'build', '--platform', 'android', '--profile', 'preview'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

let outputBuffer = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  outputBuffer += text;

  if (text.includes('Generate a new Android Keystore') || text.includes('Generate new Keystore')) {
    console.log('\n[AUTO-RESPONSE] Sending "yes" for keystore generation...\n');
    child.stdin.write('yes\n');
    setTimeout(() => child.stdin.write('\n'), 500);
  }

  if (text.includes('Which build profile') || text.includes('Select a build profile')) {
    console.log('\n[AUTO-RESPONSE] Selecting "preview" profile...\n');
    child.stdin.write('preview\n');
    setTimeout(() => child.stdin.write('\n'), 500);
  }

  if (text.includes('Would you like to automatically create') || text.includes('?')) {
    console.log('\n[AUTO-RESPONSE] Sending confirmation...\n');
    child.stdin.write('yes\n');
    setTimeout(() => child.stdin.write('\n'), 500);
  }
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  outputBuffer += text;

  if (text.includes('Generate a new Android Keystore') || text.includes('Generate new Keystore')) {
    console.log('\n[AUTO-RESPONSE] Sending "yes" for keystore generation...\n');
    child.stdin.write('yes\n');
    setTimeout(() => child.stdin.write('\n'), 500);
  }
});

child.on('close', (code) => {
  console.log(`\n\nProcess exited with code ${code}`);

  if (code === 0) {
    console.log('\n✓ Build started successfully!');
  } else {
    console.log('\n✗ Build failed with exit code:', code);
  }

  process.exit(code);
});

child.on('error', (error) => {
  console.error('Error starting process:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(1);
});
