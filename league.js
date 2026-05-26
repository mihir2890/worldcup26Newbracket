// Vercel serverless function — proxies JSONBlob so there are no CORS issues
// Routes:
//   POST   /api/league          → create new blob
//   GET    /api/league?id=xxx   → read blob
//   PUT    /api/league?id=xxx   → update blob (body = JSON)

const BLOB_BASE = 'https://jsonblob.com/api/jsonBlob';

export default async function handler(req, res) {
  // Allow all origins (we're the proxy, so it's safe)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'POST') {
      // Create new blob
      const upstream = await fetch(BLOB_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(req.body),
      });
      if (!upstream.ok) throw new Error('JSONBlob create failed: ' + upstream.status);
      const loc = upstream.headers.get('location') || '';
      const blobId = loc.split('/').pop();
      if (!blobId) throw new Error('No blob ID in Location header');
      const data = await upstream.json();
      return res.status(200).json({ id: blobId, data });
    }

    if (req.method === 'GET') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const upstream = await fetch(`${BLOB_BASE}/${id}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!upstream.ok) throw new Error('JSONBlob read failed: ' + upstream.status);
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const upstream = await fetch(`${BLOB_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(req.body),
      });
      if (!upstream.ok) throw new Error('JSONBlob update failed: ' + upstream.status);
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
