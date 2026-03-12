import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().max(160, 'Description must be 160 characters or fewer for optimal OG/SEO display'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    readingTime: z.number().optional(),
    status: z.enum(['draft', 'published']).default('draft'),
  }),
});

export const collections = { blog };
