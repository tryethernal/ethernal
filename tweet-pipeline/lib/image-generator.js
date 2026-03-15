/**
 * @fileoverview Playwright-based image generator for branded tweet card templates.
 * Renders HTML templates with injected data via URL query params and captures PNG screenshots.
 * @module image-generator
 */
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PATHS } from '../config.js';

/**
 * Maps image spec type names to HTML template filenames.
 * @type {Record<string, string>}
 */
const TEMPLATE_MAP = {
    stat_card: 'stat-card.html',
    eip_card: 'eip-card.html',
    code_snippet: 'code-snippet.html',
    quote_card: 'quote-card.html',
};

/** Card dimensions in pixels. */
const WIDTH = 1200;
const HEIGHT = 675;

/**
 * Builds a file:// URL pointing to the appropriate HTML template with data as query params.
 * @param {string} type - Template type (stat_card, eip_card, code_snippet, quote_card).
 * @param {Record<string, string>} data - Key-value pairs to inject as URL search params.
 * @returns {string} A file:// URL with encoded query parameters.
 * @throws {Error} If the template type is unknown.
 */
export function buildTemplateUrl(type, data) {
    const filename = TEMPLATE_MAP[type];
    if (!filename) {
        throw new Error(`Unknown template type: "${type}". Valid types: ${Object.keys(TEMPLATE_MAP).join(', ')}`);
    }

    const templatePath = join(PATHS.templateDir, filename);
    const params = new URLSearchParams(data);
    return `file://${templatePath}?${params.toString()}`;
}

/**
 * Renders an HTML card template via headless Chromium and saves a PNG screenshot.
 * @param {Object} imageSpec - Specification for the image to generate.
 * @param {string} imageSpec.type - Template type (stat_card, eip_card, code_snippet, quote_card).
 * @param {string} outputPath - Absolute path where the PNG file will be saved.
 * @returns {Promise<void>}
 * @throws {Error} If the template type is unknown or rendering fails.
 */
export async function generateImage(imageSpec, outputPath) {
    const { type, ...data } = imageSpec;
    const url = buildTemplateUrl(type, data);

    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: WIDTH, height: HEIGHT });
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.screenshot({ path: outputPath, type: 'png' });
    } finally {
        await browser.close();
    }
}
