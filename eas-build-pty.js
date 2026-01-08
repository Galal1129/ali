const pty = require('node-pty');
const os = require('os');

process.env.EXPO_TOKEN = 'ZO6ucB1r6vpVhPc5JrxRqu86_Sbx21pAC1LmujwI';

console.log('Starting EAS build with PTY...\n');

const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

const ptyProcess = pty.spawn(shell, ['-c', 'npx eas-cli build --platform android --profile preview'], {
  name: 'xterm-color',
  cols: 120,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

let outputBuffer = '';
let hasResponded = false;

ptyProcess.onData((data) => {
  process.stdout.write(data);
  outputBuffer += data;

  if (!hasResponded && (
    data.includes('Generate a new Android Keystore') ||
    data.includes('Generate new Keystore') ||
    data.includes('?')
  )) {
    console.log('\n[AUTO-RESPONSE] Sending "yes"...\n');
    ptyProcess.write('yes\r');
    hasResponded = true;

    setTimeout(() => {
      ptyProcess.write('\r');
    }, 1000);
  }
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`\n\nProcess exited with code ${exitCode} (signal: ${signal})`);

  if (exitCode === 0) {
    console.log('\n✓ Build started successfully!');
  } else {
    console.log('\n✗ Build process failed');
  }

  process.exit(exitCode);
});

process.on('SIGINT', () => {
  ptyProcess.kill();
  process.exit(1);
});
