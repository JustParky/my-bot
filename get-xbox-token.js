// get-xbox-token.js
const { PublicClientApplication } = require('@azure/msal-node');
require('dotenv').config();

const pca = new PublicClientApplication({
  auth: {
    clientId: process.env.XBOX_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
  }
});

async function main() {
  const deviceCodeRequest = {
    deviceCodeCallback: resp => console.log(resp.message),
    scopes: ['XboxLive.signin', 'offline_access', 'openid', 'profile'],
  };

  try {
    const tokenResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    console.log('\n✅ Refresh token:\n', tokenResponse.refreshToken);
  } catch (err) {
    console.error('❌ Failed to acquire token:', err);
  }
}

main();
