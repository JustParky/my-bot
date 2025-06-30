const axios = require('axios');
require('dotenv').config();
const apiKey = process.env.XAI_API_KEY;
console.log('Testing xAI API with key:', apiKey?.slice(0, 10) + '...');
axios.post('https://api.x.ai/v1/chat/completions', {
  model: 'grok-3',
  messages: [{ role: 'user', content: 'Hello, Nexus!' }],
}, {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
})
  .then(response => console.log('Response:', response.data.choices[0].message.content))
  .catch(err => console.error('xAI error:', err.message, err.response?.data || err));