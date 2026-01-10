const { spawn } = require('child_process');

const email = 'info@articode.com.tr';
const password = 'jlal99662870502';

const easLogin = spawn('npx', ['eas-cli', 'login'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Wait a bit before sending credentials
setTimeout(() => {
  easLogin.stdin.write(`${email}\n`);
  setTimeout(() => {
    easLogin.stdin.write(`${password}\n`);
    easLogin.stdin.end();
  }, 1000);
}, 2000);

easLogin.on('close', (code) => {
  console.log(`EAS login process exited with code ${code}`);
  process.exit(code);
});

easLogin.on('error', (error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
