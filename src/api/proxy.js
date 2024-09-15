// api/proxy.js
const axios = require('axios');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await axios.post('https://api.limewire.com/api/image/generation', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Version': 'v1',
        Authorization: `Bearer ${process.env.REACT_APP_LIME_WIRE_API_KEY}`
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
