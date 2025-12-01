const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files from repo root so you can open app.html at http://localhost:3000/app.html
app.use(express.static(path.join(__dirname)));

// Simple DOT lookup proxy. Returns JSON from FMCSA mobile endpoint (or raw text if non-JSON).
// Usage: GET /api/dot-lookup?dot=123456
app.get('/api/dot-lookup', async (req, res) => {
  const dot = (req.query.dot || '').trim();
  if (!dot) return res.status(400).json({ error: 'Missing dot query parameter' });

  const fmCSAUrl = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${encodeURIComponent(dot)}?format=json`;

  try {
    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
    const resp = await fetch(fmCSAUrl, { method: 'GET' });
    const text = await resp.text();

    // Try to parse JSON, otherwise return text
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch (e) {
      return res.type('text').send(text);
    }
  } catch (err) {
    return res.status(502).json({ error: 'Lookup failed', details: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fleetidy proxy server running on http://localhost:${PORT}`);
  console.log('Endpoint: GET /api/dot-lookup?dot={DOT}');
});
