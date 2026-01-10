const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const email = 'info@articode.com.tr';
const password = 'jlal99662870502';

const data = JSON.stringify({
  username: email,
  password: password,
});

const options = {
  hostname: 'expo.io',
  port: 443,
  path: '/--/api/v2/auth/loginAsync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Expo-Platform': 'cli',
  },
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      if (response.data && response.data.sessionSecret) {
        const token = response.data.sessionSecret;

        // Save token to ~/.expo directory
        const expoDir = path.join(os.homedir(), '.expo');
        if (!fs.existsSync(expoDir)) {
          fs.mkdirSync(expoDir, { recursive: true });
        }

        const authFile = path.join(expoDir, 'state.json');
        const state = {
          auth: {
            sessionSecret: token,
            userId: response.data.userId,
            username: response.data.username,
            currentConnection: 'Username-Password-Authentication',
          },
        };

        fs.writeFileSync(authFile, JSON.stringify(state, null, 2));
        console.log('Login successful!');
        console.log('Token saved to:', authFile);
        process.exit(0);
      } else {
        console.error('Login failed:', responseData);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.error('Response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.write(data);
req.end();
