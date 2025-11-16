import axios from 'axios';

const SESSION_API = 'https://labs.google/fx/api/auth/session';
const COOKIE_NAME = '__Secure-next-auth.session-token';
const WHISK_URL = 'https://labs.google/fx/tools/whisk';

export async function getAccessToken(sessionCookie) {
  try {
    const response = await axios.get(SESSION_API, {
      headers: {
        'Cookie': `${COOKIE_NAME}=${sessionCookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': WHISK_URL,
        'Origin': 'https://labs.google'
      },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (response.data?.code === 200 && response.data?.messages === 'ACCESS_TOKEN_REFRESH_NEEDED') {
      return { valid: false, needRefresh: true, error: 'ACCESS_TOKEN_REFRESH_NEEDED' };
    }

    const accessToken = response.data?.access_token;
    const user = response.data?.user;
    const expires = response.data?.expires;

    if (accessToken && user) {
      let expiresWarning = null;
      if (expires) {
        const expiresDate = new Date(expires);
        if (expiresDate <= new Date()) {
          expiresWarning = 'Token already expired';
        }
      }

      return {
        valid: true,
        needRefresh: false,
        accessToken,
        userInfo: { name: user.name, email: user.email, expires },
        expiresWarning
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, needRefresh: false, error: `Authentication failed (${response.status})` };
    }

    return { valid: false, needRefresh: false, error: `Unknown response. Status: ${response.status}` };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return { valid: false, needRefresh: false, error: 'Request timeout' };
    }
    return { valid: false, needRefresh: false, error: `Network error: ${error.message}` };
  }
}