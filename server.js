const express = require('express');
const { google } = require('googleapis');
const session = require('cookie-session');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(session({ 
  name: 'sess', 
  keys: [process.env.SESSION_SECRET || 'devsecret'] 
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT_URI
);

app.get('/', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/tasks'],
  });
  res.send(`<a href="${authUrl}">Authorize Google Tasks</a>`);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  req.session.tokens = tokens;
  res.send('Authorization successful! You can close this window.');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;