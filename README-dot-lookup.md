DOT Lookup Proxy and Local Server
================================

This repo includes a small Express proxy (`server.js`) that:

- Serves the repository files statically so you can open `app.html` at `http://localhost:3000/app.html`.
- Provides a proxy endpoint `/api/dot-lookup?dot={DOT}` which queries the FMCSA mobile endpoint and returns the response as JSON (or raw text if non-JSON).

Quick start
-----------

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open the form in your browser:

```
http://localhost:3000/app.html
```

Notes
-----
- The FMCSA mobile endpoint may block direct browser requests due to CORS. This proxy avoids that by making the FMCSA request server-side.
- If you deploy this in production, keep any API keys (if used) on the server and secure the endpoint appropriately.
- The client-side code in `app.html` already falls back to `/api/dot-lookup` if the FMCSA direct request fails.

If you want, I can also add a small integration test or dockerfile to run the server in a container.
