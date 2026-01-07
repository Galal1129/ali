const https = require('https');
const { execSync } = require('child_process');

const EXPO_TOKEN = 'DidnkNik64Xc4qVEmPRJHK-ceFS3Pn3GrQPcfPrK';
const PROJECT_ID = 'fd8c7b58-d09d-4b75-9024-59da6b20cf7f';

console.log('Triggering build via EAS GraphQL API...\n');

// First, let's get the latest commit hash
const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
console.log('Git commit:', gitHash);

// GraphQL mutation to start a build
const mutation = `
mutation CreateAndroidBuild(
  $appId: ID!
  $platform: AppPlatform!
  $buildProfile: String!
  $gitCommitHash: String!
) {
  build {
    createAndroidBuild(
      appId: $appId
      platform: $platform
      buildProfile: $buildProfile
      metadata: {
        trackingContext: {}
        gitCommitHash: $gitCommitHash
        distribution: INTERNAL
      }
    ) {
      build {
        id
        status
        platform
        createdAt
      }
      deprecationInfo {
        type
        message
      }
    }
  }
}`;

const variables = {
  appId: PROJECT_ID,
  platform: 'ANDROID',
  buildProfile: 'preview',
  gitCommitHash: gitHash
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
    'Authorization': `Bearer ${EXPO_TOKEN}`,
    'Expo-Session': EXPO_TOKEN
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\nAPI Response Status:', res.statusCode);
    console.log('Response:', responseData);

    try {
      const jsonResponse = JSON.parse(responseData);

      if (jsonResponse.errors) {
        console.error('\n✗ GraphQL Errors:', JSON.stringify(jsonResponse.errors, null, 2));
        process.exit(1);
      }

      if (jsonResponse.data && jsonResponse.data.build) {
        console.log('\n✓ Build started successfully!');
        console.log('Build ID:', jsonResponse.data.build.createAndroidBuild.build.id);
        console.log('Status:', jsonResponse.data.build.createAndroidBuild.build.status);
        console.log('\nCheck build status at:');
        console.log(`https://expo.dev/accounts/articodes-organization/projects/altarf-money-transfer/builds`);
      }
    } catch (error) {
      console.error('Error parsing response:', error);
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
