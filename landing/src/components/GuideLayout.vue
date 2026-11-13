<!--
  @fileoverview Shared frame for the /guides pages: hero with answer-first intro, "What you need",
  numbered steps, FAQ, related links and CTA. Page meta and the BreadcrumbList, HowTo and FAQPage
  JSON-LD are generated from the same data that is rendered, so structured data always matches
  the visible content.
  @component GuideLayout
  @prop {Object} guide - Guide definition
  @prop {string} guide.slug - URL slug under /guides, also used as utm_campaign
  @prop {string} guide.metaTitle - Page title (60 characters max)
  @prop {string} guide.metaDescription - Meta description (155 characters max)
  @prop {string} guide.kicker - Overline above the H1
  @prop {string} guide.h1 - Page heading, also the HowTo name
  @prop {string} guide.intro - Answer-first introduction (60 words max)
  @prop {string} [guide.notice] - Optional notice shown under the intro
  @prop {string[]} guide.needs - "What you need" items
  @prop {Array<{title: string, text: string, code?: string[]}>} guide.steps - Numbered steps
  @prop {Array<{q: string, a: string}>} guide.faqs - FAQ entries
  @prop {Array<{to: string, icon: string, title: string, desc: string}>} guide.related - Related links
  @prop {{label: string, flow?: string}} guide.cta - Primary call to action pointing at the app signup
  @prop {{label: string, href: string}} [guide.secondaryCta] - Optional secondary external link
  @slot extra - Content between the intro and "What you need"
-->
<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="guide-hero">
                <nav class="guide-breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <router-link to="/guides">Guides</router-link>
                    <span class="sep">/</span>
                    <span class="current">{{ guide.kicker }}</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">GUIDE</div>
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">{{ guide.h1 }}</h1>
                <p class="guide-intro">{{ guide.intro }}</p>
                <p v-if="guide.notice" class="guide-notice">{{ guide.notice }}</p>
                <div class="mt-5 d-flex ga-3 flex-wrap">
                    <a :href="appHref" class="guide-btn-primary">{{ guide.cta.label }}</a>
                    <a v-if="guide.secondaryCta" :href="guide.secondaryCta.href" class="guide-btn-secondary" target="_blank" rel="noopener noreferrer">{{ guide.secondaryCta.label }}</a>
                </div>
            </div>

            <slot name="extra" />

            <section class="my-12">
                <h2 class="guide-h2">What you need</h2>
                <ul class="guide-needs">
                    <li v-for="(item, i) in guide.needs" :key="i">{{ item }}</li>
                </ul>
            </section>

            <section class="my-12">
                <h2 class="guide-h2 mb-6">Steps</h2>
                <ol class="guide-steps">
                    <li v-for="(step, i) in guide.steps" :key="i" class="guide-step">
                        <div class="guide-step-number">{{ i + 1 }}</div>
                        <div class="guide-step-body">
                            <h3>{{ step.title }}</h3>
                            <p>{{ step.text }}</p>
                            <pre v-if="step.code" class="guide-code"><code>{{ step.code.join('\n') }}</code></pre>
                        </div>
                    </li>
                </ol>
            </section>

            <section class="my-12">
                <h2 class="guide-h2 mb-6">Troubleshooting and FAQ</h2>
                <div class="guide-faq-list">
                    <div v-for="(faq, i) in guide.faqs" :key="i" class="guide-faq-item">
                        <h3 class="guide-faq-q">{{ faq.q }}</h3>
                        <p class="guide-faq-a">{{ faq.a }}</p>
                    </div>
                </div>
            </section>

            <section class="my-12">
                <h2 class="guide-h2 mb-6">Related</h2>
                <div class="guide-related">
                    <router-link v-for="item in guide.related" :key="item.to" :to="item.to" class="guide-related-link">
                        <v-icon size="18" style="color: #5DAAE0;">{{ item.icon }}</v-icon>
                        <div>
                            <span class="guide-related-title">{{ item.title }}</span>
                            <span class="guide-related-desc">{{ item.desc }}</span>
                        </div>
                    </router-link>
                </div>
            </section>

            <section class="guide-cta">
                <h2 class="guide-h2 mb-3">Ready to try it?</h2>
                <p class="mb-5" style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem;">Sign-up is free, and the Starter plan needs no credit card.</p>
                <a :href="appHref" class="guide-btn-primary">{{ guide.cta.label }}</a>
            </section>
        </v-container>
    </LandingLayout>
</template>

<script setup>
import { computed } from 'vue';
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';

const props = defineProps({
    guide: { type: Object, required: true }
});

const appUrl = __APP_URL__;
const appHref = computed(() => `${appUrl}/auth?flow=${props.guide.cta.flow || 'public'}&utm_source=landing&utm_medium=guide&utm_campaign=${props.guide.slug}`);

const g = props.guide;
const url = `https://tryethernal.com/guides/${g.slug}`;

useHead({
    title: g.metaTitle,
    meta: [
        { name: 'description', content: g.metaDescription },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: g.metaTitle },
        { property: 'og:description', content: g.metaDescription },
        { property: 'og:url', content: url },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: g.metaTitle },
        { name: 'twitter:description', content: g.metaDescription }
    ],
    link: [
        { rel: 'canonical', href: url }
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryethernal.com/' },
                    { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryethernal.com/guides' },
                    { '@type': 'ListItem', position: 3, name: g.kicker, item: url }
                ]
            })
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: g.h1,
                description: g.metaDescription,
                step: g.steps.map((s, i) => ({
                    '@type': 'HowToStep',
                    position: i + 1,
                    name: s.title,
                    text: s.text
                }))
            })
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: g.faqs.map(f => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a }
                }))
            })
        }
    ]
});
</script>

<style scoped>
.guide-hero { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
.guide-breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.guide-breadcrumb a { color: #5DAAE0; text-decoration: none; }
.guide-breadcrumb a:hover { text-decoration: underline; }
.guide-breadcrumb .sep { color: var(--text-muted); }
.guide-breadcrumb .current { color: var(--text-secondary); }

.guide-intro { color: var(--text-secondary); max-width: 680px; line-height: 1.7; font-size: 1rem; margin: 0; }
.guide-notice { max-width: 680px; margin: 16px 0 0; padding: 12px 16px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid rgba(245, 158, 11, 0.5); border-radius: 0 8px 8px 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; }

.guide-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
    background: #3D95CE; color: #fff;
}
.guide-btn-primary:hover { background: #357fb0; }
.guide-btn-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
    background: transparent; color: var(--text-secondary); border: 1px solid var(--border-subtle);
}
.guide-btn-secondary:hover { color: var(--text-primary); border-color: rgba(61, 149, 206, 0.4); }

.guide-h2 { font-family: inherit; color: var(--text-primary); font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em; margin-bottom: 16px; }

.guide-needs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; max-width: 760px; }
.guide-needs li { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; padding-left: 22px; position: relative; }
.guide-needs li::before { content: '\2713'; position: absolute; left: 2px; color: #22C55E; font-weight: 700; }

.guide-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 24px; max-width: 800px; }
.guide-step { display: flex; gap: 16px; align-items: flex-start; }
.guide-step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.guide-step-body { min-width: 0; flex: 1; }
.guide-step-body h3 { color: var(--text-primary); font-weight: 600; font-size: 1.05rem; margin: 4px 0 6px; }
.guide-step-body p { color: var(--text-secondary); font-size: 0.93rem; line-height: 1.7; margin: 0; }
.guide-code { margin: 12px 0 0; padding: 14px 16px; background: var(--glass-bg-strong); border: 1px solid var(--border-subtle); border-radius: 8px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.7; color: #A5D6FF; }

.guide-faq-list { display: flex; flex-direction: column; gap: 12px; max-width: 800px; }
.guide-faq-item { padding: 18px 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; }
.guide-faq-q { color: var(--text-primary); font-size: 0.95rem; font-weight: 600; margin: 0 0 8px; }
.guide-faq-a { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.7; margin: 0; }

.guide-related { display: flex; flex-direction: column; gap: 8px; max-width: 800px; }
.guide-related-link { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; text-decoration: none; transition: border-color 0.2s; }
.guide-related-link:hover { border-color: var(--border-glow); }
.guide-related-link div { display: flex; flex-direction: column; gap: 2px; }
.guide-related-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.guide-related-desc { color: var(--text-muted); font-size: 0.8rem; }

.guide-cta { margin-top: 48px; padding: 32px; text-align: center; background: var(--glass-bg); border: 1px solid var(--border-subtle); border-radius: 16px; }
</style>
