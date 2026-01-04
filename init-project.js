const { execSync } = require('child_process');

try {
  // Set the token
  process.env.EXPO_TOKEN = 't67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo';
  
  console.log('Initializing EAS project...');
  
  // Try to create the project by running eas init
  const result = execSync('./node_modules/.bin/eas init --id new --non-interactive', {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  console.log(result);
  console.log('Project initialized successfully!');
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('stdout:', error.stdout);
  if (error.stderr) console.error('stderr:', error.stderr);
  process.exit(1);
}
