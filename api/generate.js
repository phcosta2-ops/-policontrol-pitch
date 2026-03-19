const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key nao configurada' });

  try {
    // Lê o body manualmente do stream
    const payload = await new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', chunk => raw += chunk);
      req.on('end', () => resolve(raw));
      req.on('error', reject);
    });

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const request = https.request(options, (response) => {
        let result = '';
        response.on('data', chunk => result += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(result)); }
          catch (e) { reject(new Error(result.slice(0, 200))); }
        });
      });

      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
