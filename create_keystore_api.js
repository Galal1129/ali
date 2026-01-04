const https = require('https');

const token = 't67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo';
const projectId = '4878bcf1-001e-4ecf-a688-869f22c96198';

// GraphQL mutation to generate keystore
const mutation = `
mutation AndroidKeystoreGenerationMutation($androidKeystoreInput: AndroidKeystoreInput!, $accountId: ID!, $appId: ID!) {
  androidKeystore {
    createAndroidKeystore(androidKeystoreInput: $androidKeystoreInput, accountId: $accountId, appId: $appId) {
      id
      type
      keystore
      keystorePassword
      keyAlias
      keyPassword
    }
  }
}
`;

const variables = {
  androidKeystoreInput: {
    type: "JKS"
  },
  accountId: "arti_codeio",
  appId: projectId
};

const data = JSON.stringify({
  query: mutation,
  variables: variables
});

const options = {
  hostname: 'api.expo.dev',
  port: 443,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`,
    'Expo-Session': token
  }
};

console.log('Creating Android Keystore...');

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', body);
    try {
      const response = JSON.parse(body);
      if (response.data && response.data.androidKeystore) {
        console.log('\n✓ Keystore created successfully!');
        process.exit(0);
      } else if (response.errors) {
        console.error('\n✗ Error:', response.errors[0].message);
        process.exit(1);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
  process.exit(1);
});

req.write(data);
req.end();

