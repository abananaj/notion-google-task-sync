const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: credentials.refresh_token
    });
    return oauth2Client;
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client, clientId, clientSecret) {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: client.credentials.refresh_token,
  });

  await fs.writeFile(TOKEN_PATH, payload);
}

function getCodeFromCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          res.end('✅ Success! Close this window and return to terminal.');
          server.close();
          resolve(code);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(3000);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('Port 3000 in use. Close other apps and try again.'));
      } else {
        reject(err);
      }
    });
  });
}
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    try {
      await client.getAccessToken();
      return client;
    } catch (err) {
      console.log('⚠️  Token expired, re-authenticating...');
    }
  }

  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;

  if (!key) {
    throw new Error('Invalid credentials.json - download from Google Cloud Console');
  }

  const oauth2Client = new google.auth.OAuth2(
    key.client_id,
    key.client_secret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Opening browser for Google login...\n');

  try {
    await open(authUrl);
  } catch (err) {
    console.log('Visit:', authUrl);
  }

  const code = await getCodeFromCallback();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  await saveCredentials(oauth2Client, key.client_id, key.client_secret);
  console.log('✅ Authenticated!\n');

  return oauth2Client;
}

module.exports = { authorize };