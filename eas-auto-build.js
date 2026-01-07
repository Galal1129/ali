const { spawn } = require('child_process');

// Set environment variables
process.env.EXPO_TOKEN = 'DidnkNik64Xc4qVEmPRJHK-ceFS3Pn3GrQPcfPrK';

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

  // Check for prompts and respond automatically
  if (text.includes('Generate a new Android Keystore?')) {
    console.log('\n[AUTO-RESPONSE] Sending "yes" for keystore generation...\n');
    child.stdin.write('yes\n');
  }

  if (text.includes('Which build profile do you want to configure?')) {
    console.log('\n[AUTO-RESPONSE] Selecting "preview" profile...\n');
    child.stdin.write('preview\n');
  }

  if (text.includes('Would you like to automatically create') || text.includes('Select a build profile')) {
    console.log('\n[AUTO-RESPONSE] Sending "yes"...\n');
    child.stdin.write('yes\n');
  }
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  outputBuffer += text;

  // Check for prompts in stderr too
  if (text.includes('Generate a new Android Keystore?')) {
    console.log('\n[AUTO-RESPONSE] Sending "yes" for keystore generation...\n');
    child.stdin.write('yes\n');
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

// Handle process termination
process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(1);
});
