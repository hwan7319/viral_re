import axios from 'axios';
import { getDB } from '../lib/db';

type ImageRow = { id: string; targetSite: string; imageUrl: string };

const samplePerSource = Math.max(1, Math.min(30, Number(process.env.IMAGE_AUDIT_SAMPLE || 20)));
const concurrency = 10;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

function isFallback(url: string) {
  return !url || url.includes('/icon.png');
}

function isImagePayload(payload: ArrayBuffer) {
  const bytes = Buffer.from(payload);
  return (
    (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || // JPEG
    (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) || // PNG
    bytes.subarray(0, 3).toString() === 'GIF' ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
  );
}

async function checkImage(row: ImageRow) {
  if (isFallback(row.imageUrl)) return { ...row, status: 'FALLBACK' as const };
  try {
    const response = await axios.get(row.imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Range: 'bytes=0-1023',
      },
      responseType: 'arraybuffer',
      timeout: 8_000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    return {
      ...row,
      // Several CDN origins return octet-stream for an otherwise valid JPEG.
      // Inspect the first bytes as browsers do rather than treating that header
      // quirk as an unavailable thumbnail.
      status: response.status >= 200 && response.status < 300 && (contentType.startsWith('image/') || isImagePayload(response.data)) ? 'OK' as const : 'BROKEN' as const,
      httpStatus: response.status,
      contentType,
    };
  } catch (error) {
    return { ...row, status: 'ERROR' as const, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const db = await getDB();
  const sources = await db.all<{ targetSite: string }[]>(
    `SELECT DISTINCT targetSite FROM campaigns WHERE endDate = '' OR endDate >= ? ORDER BY targetSite`,
    [today],
  );
  const rows: ImageRow[] = [];
  for (const { targetSite } of sources) {
    rows.push(...await db.all<ImageRow[]>(
      `SELECT id, targetSite, imageUrl FROM campaigns
       WHERE targetSite = ? AND (endDate = '' OR endDate >= ?)
       ORDER BY updatedAt DESC LIMIT ?`,
      [targetSite, today, samplePerSource],
    ));
  }

  const results: Awaited<ReturnType<typeof checkImage>>[] = [];
  for (let index = 0; index < rows.length; index += concurrency) {
    results.push(...await Promise.all(rows.slice(index, index + concurrency).map(checkImage)));
  }
  const bySource = Object.fromEntries(sources.map(({ targetSite }) => {
    const sourceResults = results.filter(result => result.targetSite === targetSite);
    const broken = sourceResults.filter(result => result.status === 'BROKEN' || result.status === 'ERROR' || result.status === 'FALLBACK');
    return [targetSite, {
      sampled: sourceResults.length,
      ok: sourceResults.filter(result => result.status === 'OK').length,
      broken: broken.length,
      examples: broken.slice(0, 3).map(({ id, imageUrl, status, ...rest }) => ({ id, imageUrl, status, ...rest })),
    }];
  }));
  const failed = results.filter(result => result.status !== 'OK');
  console.log(`IMAGE_AUDIT_JSON=${JSON.stringify({ auditedAt: new Date().toISOString(), today, samplePerSource, total: results.length, passed: results.length - failed.length, failed: failed.length, bySource })}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(error => { console.error(error); process.exit(1); });
