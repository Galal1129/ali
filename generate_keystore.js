const { spawn } = require('child_process');

const proc = spawn('./node_modules/.bin/eas', ['credentials'], {
  env: { ...process.env, EXPO_TOKEN: 't67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

proc.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log(text);
  
  // Auto-respond to prompts
  if (text.includes('Select platform')) {
    setTimeout(() => proc.stdin.write('Android\n'), 500);
  } else if (text.includes('What do you want to do')) {
    setTimeout(() => proc.stdin.write('Set up a new keystore\n'), 500);
  } else if (text.includes('Generate a new Android Keystore')) {
    setTimeout(() => proc.stdin.write('\n'), 500);
  }
});

proc.stderr.on('data', (data) => {
  console.error(data.toString());
});

proc.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});

setTimeout(() => {
  console.log('Timeout - closing process');
  proc.kill();
  process.exit(1);
}, 60000);

