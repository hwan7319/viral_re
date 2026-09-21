export function koreanDate(date = new Date()): string {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}
export function deadlineFromText(text: string, now = new Date()): string {
  if (/모집\s*마감|종료|D\s*\+/i.test(text)) return '';
  if (/내일\s*마감/i.test(text)) return koreanDate(new Date(now.getTime() + 86400000));
  const match = text.match(/D\s*-\s*(\d+)|(\d+)\s*일\s*남음/i);
  if (match) return koreanDate(new Date(now.getTime() + Number(match[1] || match[2]) * 86400000));
  if (/오늘\s*마감|D\s*-?\s*day/i.test(text)) return koreanDate(now);
  return '';
}
