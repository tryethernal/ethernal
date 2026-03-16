/**
 * @fileoverview Gemini-based image generator for branded tweet cards.
 * Uses the same visual style as Ethernal blog cover images.
 * @module image-generator
 */
import { writeFileSync } from 'node:fs';

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Style prefix matching the Ethernal blog cover aesthetic.
 * Learned from 4+ rounds of prompt iteration.
 */
const STYLE_PREFIX = `Clean flat illustration on a dark navy (#0F1729) background with a subtle dot grid. Simple shapes, soft blue (#3D95CE) and white accents. NOT futuristic, NOT glowy, NOT 3D. Flat design, like a clean tech blog illustration. Landscape format 1200x675. The composition must be properly centered with balanced whitespace on all sides.`;

/**
 * Prompt rules learned from testing:
 * - Be explicit about text placement: "Title at top in large white text"
 * - Say "Do NOT repeat any text" — Gemini tends to duplicate
 * - Describe diagrams simply: "two-panel", "3 connected boxes", "timeline with nodes"
 * - Limit text: "Nothing else written below the diagram"
 * - Use the metric as the hero element when it's a number
 */
const PROMPT_RULES = `Do NOT repeat any text. Each piece of text appears exactly once. Keep the layout extremely clean and minimal. Maximum 3-4 visual elements.`;

/**
 * Builds a Gemini prompt from an imageSpec.
 * @param {Object} spec - Image specification from the draft phase.
 * @param {string} spec.title - Main title text.
 * @param {string} spec.subtitle - Secondary text.
 * @param {string} [spec.metric] - Key number/stat to display prominently.
 * @param {string} [spec.diagram] - Optional diagram description from the draft.
 * @param {string} [spec.code] - Code snippet content.
 * @param {string} [spec.quote] - Quote text.
 * @param {string} [spec.author] - Quote attribution.
 * @returns {string} Complete prompt for Gemini.
 */
function buildPrompt(spec) {
    const { title, subtitle, metric, diagram, code, quote, author } = spec;

    let content = `Title at top in large white text: "${title}"`;

    if (metric) {
        content += `\nDisplay the metric "${metric}" prominently — large font, centered or near the title.`;
    }

    if (subtitle) {
        content += `\nSubtitle in smaller gray text below the title: "${subtitle}"`;
    }

    if (diagram) {
        content += `\nDiagram: ${diagram}`;
    } else if (code) {
        content += `\nShow a code block with dark background containing: ${code.substring(0, 200)}`;
    } else if (quote) {
        content += `\nShow a quote card with: "${quote}"${author ? ` — ${author}` : ''}`;
    } else {
        // Auto-generate a simple diagram description from the title
        content += `\nBelow the title, show a simple flat diagram that visually represents the concept. Use labeled boxes, arrows, or icons. Keep it diagrammatic, not illustrative.`;
    }

    content += `\nNothing else written below the diagram.`;

    return `${STYLE_PREFIX}\n\n${content}\n\n${PROMPT_RULES}`;
}

/**
 * Generates a branded tweet card image using the Gemini API.
 * Falls back gracefully if the API fails or returns no image.
 * @param {Object} imageSpec - Specification from the draft phase.
 * @param {string} outputPath - Absolute path where the PNG file will be saved.
 * @returns {Promise<boolean>} True if image was generated, false on failure.
 */
export async function generateImage(imageSpec, outputPath) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not set — skipping image generation');
        return false;
    }

    const { type, slug, ...specData } = imageSpec;

    // blog_cover type uses existing images, not Gemini
    if (type === 'blog_cover') {
        console.log('blog_cover type handled by draft.sh, not image-generator');
        return false;
    }

    const prompt = buildPrompt(specData);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
                })
            });

            if (!res.ok) {
                console.error(`Gemini API error (attempt ${attempt}): ${res.status}`);
                if (attempt < 3) { await sleep(4000); continue; }
                return false;
            }

            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find(p => p.inlineData);

            if (imagePart) {
                const buf = Buffer.from(imagePart.inlineData.data, 'base64');
                writeFileSync(outputPath, buf);
                console.log(`Image generated (attempt ${attempt}): ${outputPath} (${buf.length} bytes)`);
                return true;
            }

            console.warn(`Gemini returned no image (attempt ${attempt}) — retrying`);
            if (attempt < 3) await sleep(4000);
        } catch (err) {
            console.error(`Gemini error (attempt ${attempt}):`, err.message);
            if (attempt < 3) await sleep(4000);
        }
    }

    console.error('Failed to generate image after 3 attempts');
    return false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Keep buildPrompt exported for testing
export { buildPrompt };
