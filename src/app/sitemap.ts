import type { MetadataRoute } from 'next';

const baseUrl = 'https://viral-re.co.kr';
const updatedAt = new Date('2026-10-14T00:00:00+09:00');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: updatedAt, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/guide`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/methodology`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: updatedAt, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/insights`, lastModified: updatedAt, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/insights/visit-delivery`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/insights/platform-guide`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/insights/application-checklist`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/insights/data-standards`, lastModified: updatedAt, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
