import axios from 'axios';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * 🔑 Revu Auto-Login & Token Refresh Manager
 * Automatically logs in using REVU_ID and REVU_PASSWORD env vars,
 * caches the Bearer JWT token, and refreshes it before expiration.
 */
export async function getRevuAuthToken(): Promise<string | null> {
  const now = Date.now();
  // Return cached token if valid for at least another 10 minutes
  if (cachedToken && tokenExpiresAt > now + 600000) {
    return cachedToken;
  }

  const username = process.env.REVU_ID || 'itellme7319@gmail.com';
  const password = process.env.REVU_PASSWORD || 'sh73194862!';

  if (!username || !password) {
    return process.env.REVU_AUTH_TOKEN || null;
  }

  try {
    console.log(`🔑 [REVU AUTH] Requesting fresh auth token for ${username}...`);
    const res = await axios.post('https://api.weble.net/tokens', {
      username,
      password,
      remember: true
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Origin': 'https://www.revu.net',
        'Referer': 'https://www.revu.net/'
      },
      timeout: 6000
    });

    if (res.data && res.data.token) {
      cachedToken = res.data.token;
      // Tokens typically last 24h, cache for 12 hours (12 * 3600 * 1000)
      tokenExpiresAt = now + 12 * 3600 * 1000;
      console.log('✅ [REVU AUTH] Fresh token successfully acquired and cached!');
      return cachedToken;
    }
  } catch (err: any) {
    console.warn('⚠️ [REVU AUTH] Auto-login token request failed:', err.message);
  }

  return process.env.REVU_AUTH_TOKEN || null;
}
