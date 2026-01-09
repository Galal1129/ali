const { execSync } = require('child_process');
const fs = require('fs');

async function setupCredentials() {
  try {
    console.log('Starting EAS build process...');

    // Set environment variable
    process.env.EXPO_TOKEN = 'DidnkNik64Xc4qVEmPRJHK-ceFS3Pn3GrQPcfPrK';
    process.env.EAS_NO_VCS = '1';

    console.log('Executing build command...');

    // Try to execute the build command with yes piped
    const buildCommand = 'yes | npx eas-cli build --platform android --profile preview';

    try {
      execSync(buildCommand, {
        stdio: 'inherit',
        shell: '/bin/bash',
        env: { ...process.env }
      });
    } catch (error) {
      console.error('Build command failed:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupCredentials();
