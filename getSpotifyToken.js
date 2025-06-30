const express = require('express');
const open = require('open').default;

const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 8888;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'http://127.0.0.1:8888/callback';
const scopes = 'user-read-private user-read-email playlist-read-private';

app.get('/', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
    scopes
  )}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
  open(authUrl);
  res.send('Redirecting to Spotify login...');
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        code,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.send('✅ Refresh Token: ' + response.data.refresh_token);
    console.log('✅ Your Refresh Token:\n', response.data.refresh_token);
    process.exit(0);
  } catch (error) {
    res.send('❌ Error getting token');
    console.error('Token error:', error.response?.data || error.message);
  }
});

app.listen(port, () => {
  console.log(`🚀 Open http://127.0.0.1:${port} in your browser`);
});
