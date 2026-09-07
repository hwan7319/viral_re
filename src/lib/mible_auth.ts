/**
 * 🔑 Mible (미블 - mrblog.net) Auth Session & XHR API Manager
 */

export function getMibleSessionCookie(): string {
  return process.env.MIBLE_SESSION_COOKIE || 
         process.env.MIBLE_LARAVEL_SESSION || 
         'eyJpdiI6ImIrQmhpT1UxQzZJUkROd2JUT2RjTXc9PSIsInZhbHVlIjoicnF2VlJJTkpmRSt0ODNYejkrWmc5akh3bkdNNzdyU3kwYkNmZFU5ZWFINmNmOG5KbEhlL1ltMHZNU1g2SXRNanRMYjk3Yk1NZjdrU0swYUN4eUM0aWJsV0k0SC9mUmpPa0ZDVWRFTWFjMUxWN1E3SXpOWEVYTElZT2E1S2V0bWciLCJtYWMiOiI3MzljNDc3M2MwN2ZhOGRjNzlmODM4YzhjY2ZiZGQxNDdhYTNmZWQ2Y2E2NzQ2OGZkNGVkOTA3Zjg0NjJkMmRhIiwidGFnIjoiIn0%3D';
}

export function getMibleHeaders(referer?: string): Record<string, string> {
  const sessionCookie = getMibleSessionCookie();
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': referer || 'https://www.mrblog.net/',
    'Cookie': `laravel_session=${sessionCookie}`
  };
}
