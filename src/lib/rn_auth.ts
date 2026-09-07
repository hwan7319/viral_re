/**
 * 🔑 ReviewNote (리뷰노트) Auth Session & Token Manager
 * Manages RN_SESSION_TOKEN / RN_AUTH_TOKEN environment variables
 * to supply authenticated session cookies for ReviewNote API calls.
 */

export function getReviewNoteAuthToken(): string | null {
  return process.env.RN_SESSION_TOKEN || process.env.RN_AUTH_TOKEN || null;
}

export function getReviewNoteHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Referer': 'https://www.reviewnote.co.kr/campaigns',
    'Origin': 'https://www.reviewnote.co.kr'
  };

  const token = getReviewNoteAuthToken();
  if (token) {
    headers['Cookie'] = `__Secure-next-auth.session-token=${token}; next-auth.session-token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
