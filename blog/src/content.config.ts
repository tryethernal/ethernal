import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Set by the refresh pipeline when an existing post is updated in place.
    // Renders as "Updated: <date>" and JSON-LD dateModified. Optional —
    // existing posts default to dateModified === date.
    updatedDate: z.coerce.date().optional(),
    description: z.string().max(160, 'Description must be 160 characters or fewer for optimal OG/SEO display'),
    tags: z.array(z.string()).default([]),
    // SEO keyword grounding (separate from reader-facing `tags`). Populated by
    // the keyword-enrichment pipeline; rendered into JSON-LD BlogPosting.keywords,
    // not as UI chips. Defaults to [] so existing posts keep building.
    keywords: z.array(z.string()).default([]),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    readingTime: z.number().optional(),
    status: z.enum(['published']).default('published'),
  }),
});

export const collections = { blog };
