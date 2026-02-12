/**
 * Cloudflare Worker - GA4 API Proxy
 * 
 * This worker acts as a secure proxy between your Traffic-Flow dashboard
 * and Google Analytics 4 Data API.
 * 
 * Setup:
 * 1. Deploy this to Cloudflare Workers
 * 2. Add GA4_SERVICE_ACCOUNT secret with your service account JSON
 * 3. Update your dashboard config with this worker's URL
 */

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Get OAuth token from service account
async function getAccessToken(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Create JWT
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Sign with private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(atob(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '').replace(/\n/g, ''))),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Helper function to convert string to ArrayBuffer
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Fetch realtime data from GA4
async function fetchRealtimeData(propertyId, accessToken) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dimensions: [
          { name: 'country' },
          { name: 'deviceCategory' },
          { name: 'sessionDefaultChannelGroup' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
      }),
    }
  );

  return await response.json();
}

// Fetch historical report from GA4
async function fetchHistoricalData(propertyId, startDate, endDate, accessToken) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' },
          { name: 'sessionDefaultChannelGroup' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' },
        ],
      }),
    }
  );

  return await response.json();
}

// Main request handler
async function handleRequest(request, env) {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse service account from environment
    const serviceAccount = JSON.parse(env.GA4_SERVICE_ACCOUNT);
    const accessToken = await getAccessToken(serviceAccount);

    // Route requests
    if (url.pathname === '/api/ga4/realtime' && request.method === 'POST') {
      const { propertyId } = await request.json();
      const data = await fetchRealtimeData(propertyId, accessToken);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/ga4/reports' && request.method === 'POST') {
      const { propertyId, startDate, endDate } = await request.json();
      const data = await fetchHistoricalData(propertyId, startDate, endDate, accessToken);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
