const https = require('https');

// Netlify Function to update Auth0 user_metadata using M2M credentials.
// Environment variables required (set in Netlify dashboard or local .env for testing):
// AUTH0_DOMAIN, AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { userId, user_metadata } = body;
  if (!user_metadata) {
    return { statusCode: 400, body: 'Missing user_metadata' };
  }

  // Require caller to provide their access token in Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Missing Authorization header' };
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
  const M2M_CLIENT_ID = process.env.AUTH0_MGMT_CLIENT_ID;
  const M2M_CLIENT_SECRET = process.env.AUTH0_MGMT_CLIENT_SECRET;

  if (!AUTH0_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
    return { statusCode: 500, body: 'Server not configured (missing Auth0 M2M credentials)' };
  }

  try {
    // 0) Verify caller: call Auth0 /userinfo with the access token to get their sub
    const caller = await fetchUserInfo(AUTH0_DOMAIN, accessToken);
    if (!caller || !caller.sub) {
      return { statusCode: 401, body: 'Invalid user token' };
    }
    const targetUserId = caller.sub;

    // 1) Get Management API token via client credentials
    const tokenRes = await fetchToken(AUTH0_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET);
    if (!tokenRes || !tokenRes.access_token) {
      return { statusCode: 500, body: 'Failed to obtain management token' };
    }

    const mgmtToken = tokenRes.access_token;

    // 2) PATCH user metadata for the authenticated caller only
    const patchRes = await patchUserMetadata(AUTH0_DOMAIN, targetUserId, mgmtToken, user_metadata);
    if (!patchRes) {
      return { statusCode: 500, body: 'Auth0 update failed' };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('update-user-metadata error', e);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

function fetchToken(domain, clientId, clientSecret) {
  const url = `https://${domain}/oauth/token`;
  const data = JSON.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: `https://${domain}/api/v2/`
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function patchUserMetadata(domain, userId, token, user_metadata) {
  const url = `https://${domain}/api/v2/users/${encodeURIComponent(userId)}`;
  const data = JSON.stringify({ user_metadata });

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Authorization': `Bearer ${token}` } }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(chunks || '{}');
            resolve(parsed);
          } catch (e) {
            resolve(true);
          }
        } else {
          console.error('patchUserMetadata failed', res.statusCode, chunks);
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fetchUserInfo(domain, token) {
  const url = `https://${domain}/userinfo`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(chunks || '{}');
            resolve(parsed);
          } catch (e) {
            resolve(null);
          }
        } else {
          console.error('fetchUserInfo failed', res.statusCode, chunks);
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
