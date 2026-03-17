/**
 * @fileoverview Build-time sitemap generator for vite-ssg.
 * Called via ssgOptions.onFinished hook after all pages are rendered.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://tryethernal.com';

const PRIORITY_MAP = {
    '/': { priority: '1.0', changefreq: 'weekly' },
    '/pricing': { priority: '0.8', changefreq: 'monthly' },
    '/features': { priority: '0.8', changefreq: 'monthly' },
    '/developers': { priority: '0.7', changefreq: 'monthly' },
    '/teams': { priority: '0.7', changefreq: 'monthly' },
    '/contact-us': { priority: '0.5', changefreq: 'yearly' },
    '/terms': { priority: '0.3', changefreq: 'yearly' },
    '/privacy': { priority: '0.3', changefreq: 'yearly' },
};

const DEFAULT_PRIORITY = { priority: '0.6', changefreq: 'monthly' };

export function generateSitemap(routes, outDir) {
    const lastmod = new Date().toISOString().split('T')[0];

    const urls = routes
        .filter(r => !['/404'].includes(r))
        .map(route => {
            const { priority, changefreq } = PRIORITY_MAP[route] || DEFAULT_PRIORITY;
            return `  <url>\n    <loc>${BASE_URL}${route}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
        });

    urls.push(`  <url>\n    <loc>${BASE_URL}/blog</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    writeFileSync(resolve(outDir, 'sitemap.xml'), xml);
    console.log(`Sitemap generated: ${urls.length} URLs`);
}
