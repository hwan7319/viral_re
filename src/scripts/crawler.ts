import { runCrawlerCore } from '../lib/crawler-core';

async function main() {
  console.log('--- CLI Crawler Execution ---');
  const startTime = Date.now();
  const result = await runCrawlerCore();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`Crawler Execution Completed in ${duration}s!`);
  console.log(`Source Type: ${result.isMock ? 'Mock Fallback' : 'Live Crawled'}`);
  console.log(`Inserted: ${result.inserted}, Updated: ${result.updated}`);
  console.log('-----------------------------');
}

main().catch(err => {
  console.error('Fatal CLI crawler error:', err);
});
