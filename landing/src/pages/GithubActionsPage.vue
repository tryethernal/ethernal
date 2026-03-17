<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethernal + GitHub Actions</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Integrate Ethernal into your CI/CD pipeline. Run a local node in GitHub Actions and sync it to Ethernal for automated testing visibility.
                </p>
            </div>

            <FeatureSection inline-icon compact icon="mdi-github" title="CI-Friendly Setup" description="Run Hardhat or Anvil in your GitHub Actions workflow and sync transactions to Ethernal. Every CI run gets its own workspace so you can see exactly what your test suite did on-chain.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>.github/workflows/test.yml</div><div style="width: 42px;"></div></div>
                        <div class="preview-body terminal-mock">
                            <div class="code-line"><span class="line-num">1</span><span class="yaml-key">name:</span><span class="yaml-val"> test</span></div>
                            <div class="code-line"><span class="line-num">2</span><span class="yaml-key">on:</span><span class="yaml-val"> [push]</span></div>
                            <div class="code-line"><span class="line-num">3</span><span class="yaml-key">jobs:</span></div>
                            <div class="code-line"><span class="line-num">4</span><span class="yaml-indent">  </span><span class="yaml-key">test:</span></div>
                            <div class="code-line"><span class="line-num">5</span><span class="yaml-indent">    </span><span class="yaml-key">steps:</span></div>
                            <div class="code-line"><span class="line-num">6</span><span class="yaml-indent">      </span><span class="yaml-step">- run:</span><span class="yaml-cmd"> npx hardhat node &</span></div>
                            <div class="code-line"><span class="line-num">7</span><span class="yaml-indent">      </span><span class="yaml-step">- run:</span><span class="yaml-cmd"> npx hardhat test</span></div>
                            <div class="code-line"><span class="line-num">8</span><span class="yaml-indent">        </span><span class="yaml-comment"># Ethernal syncs via plugin</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-bug" title="Debug Failed Tests" description="When a CI test fails, check the Ethernal workspace for that run. See the exact transaction that reverted, its call trace, and the revert reason. No more guessing from log output." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/tx/0x1b14…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-trace">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                    <span class="status-chip error">Reverted</span>
                                </div>
                                <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x7a25…f832</span><span class="trace-method">deposit(uint256)</span></div>
                                <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x1f98…4e23</span><span class="trace-method">balanceOf(address)</span></div>
                                <div class="trace-node indent"><span class="trace-op call">CALL</span><span class="trace-addr">0xdac1…1ec7</span><span class="trace-method">transferFrom(address,address,uint256)</span></div>
                                <div class="trace-node indent-2"><span class="trace-op revert">REVERT</span><span class="trace-reason">ERC20: insufficient allowance</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-history" title="Historical Test Runs" description="Each CI run creates a timestamped workspace. Compare contract behavior across commits, track gas usage regressions, and keep an audit trail of your test history.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>app.tryethernal.com/workspaces</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-workspaces">
                                <div class="mock-ws"><span class="ws-name">CI #847 <span class="ws-branch">main</span></span><span class="ws-status pass">14 txns</span><span class="ws-time">2 min ago</span></div>
                                <div class="mock-ws"><span class="ws-name">CI #846 <span class="ws-branch">feat/swap</span></span><span class="ws-status fail">Reverted</span><span class="ws-time">18 min ago</span></div>
                                <div class="mock-ws"><span class="ws-name">CI #845 <span class="ws-branch">main</span></span><span class="ws-status pass">12 txns</span><span class="ws-time">1 hour ago</span></div>
                                <div class="mock-ws"><span class="ws-name">CI #844 <span class="ws-branch">fix/auth</span></span><span class="ws-status pass">8 txns</span><span class="ws-time">3 hours ago</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>
        </v-container>

        <!-- Contact form for custom CI integration -->
        <section style="background: var(--glass-bg); border-top: 1px solid var(--drawer-divider); padding: 80px 0;">
            <v-container style="max-width: 600px;">
                <div class="text-center mb-8">
                    <h2 class="font-heading mb-3" style="font-weight: 700; font-size: clamp(1.4rem, 3vw, 1.8rem); color: var(--text-primary); letter-spacing: -0.02em;">Need a Custom CI Integration?</h2>
                    <p style="color: var(--text-secondary); line-height: 1.7;">
                        We can help you set up Ethernal in your specific CI/CD environment. Tell us about your setup.
                    </p>
                </div>
                <div class="contact-card">
                    <v-form @submit.prevent="onSubmit" v-model="valid">
                        <v-text-field v-model="form.email" label="Email" type="email" :rules="[v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'Invalid']" class="mb-2" variant="outlined" bg-color="transparent" base-color="#334155" color="#5DAAE0" density="comfortable" />
                        <v-textarea v-model="form.message" label="Tell us about your CI setup" :rules="[v => !!v || 'Required']" rows="4" class="mb-4" variant="outlined" bg-color="transparent" base-color="#334155" color="#5DAAE0" density="comfortable" />
                        <v-btn type="submit" class="btn-primary contact-submit" block :disabled="!valid || loading" :loading="loading" rounded="lg">
                            Send
                        </v-btn>
                        <div v-if="success" class="text-success text-center mt-4" style="font-size: 14px;">
                            <v-icon class="mr-1" size="18">mdi-check-circle</v-icon>
                            Sent! We'll get back to you soon.
                        </div>
                    </v-form>
                </div>
            </v-container>
        </section>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';

useHead({
    title: 'GitHub Actions — Ethernal Block Explorer',
    meta: [
        { name: 'description', content: 'Automate block explorer deployment in CI/CD. Ethernal GitHub Action for testing smart contracts with full visibility.' },
        { property: 'og:title', content: 'GitHub Actions — Ethernal Block Explorer' },
        { property: 'og:description', content: 'Automate block explorer deployment in CI/CD. Ethernal GitHub Action for testing smart contracts with full visibility.' },
        { property: 'og:url', content: 'https://tryethernal.com/github-actions' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/github-actions' }
    ]
});
import { ref, reactive } from 'vue';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';

const valid = ref(false);
const loading = ref(false);
const success = ref(false);
const form = reactive({ email: '', message: '' });

async function onSubmit() {
    if (!valid.value) return;
    loading.value = true;
    try {
        const res = await fetch(`${import.meta.env.VITE_APP_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { ...form, subject: 'GitHub Actions CI Integration' } })
        });
        if (!res.ok) throw new Error('Server error');
        success.value = true;
    } catch {
        alert('Error sending. Please email contact@tryethernal.com');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; } .dot.red { background: #ff5f56; } .dot.yellow { background: #febc2e; } .dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* YAML terminal mock */
.terminal-mock { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; }
.code-line { display: flex; gap: 12px; padding: 0 4px; }
.line-num { color: #334155; font-size: 11px; user-select: none; min-width: 16px; text-align: right; }
.yaml-key { color: #5DAAE0; } .yaml-val { color: #E6EDF3; } .yaml-indent { color: transparent; } .yaml-step { color: #A78BFA; } .yaml-cmd { color: #E6EDF3; } .yaml-comment { color: #484F58; }

/* Trace mock */
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; flex-wrap: wrap; } .trace-node.indent { padding-left: 20px; } .trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.revert { background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; } .trace-method { color: #CBD5E1; font-size: 11px; }
.trace-reason { color: #EF4444; font-size: 11px; font-weight: 500; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.error { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }

/* Workspaces mock */
.mock-workspaces { display: flex; flex-direction: column; gap: 2px; }
.mock-ws { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; border-bottom: 1px solid var(--drawer-divider); }
.mock-ws:hover { background: var(--glass-bg); }
.ws-name { color: var(--text-primary); font-size: 12px; font-weight: 500; }
.ws-branch { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; background: rgba(61, 149, 206, 0.1); color: #5DAAE0; border: 1px solid rgba(61, 149, 206, 0.15); margin-left: 6px; }
.ws-status { font-size: 11px; font-weight: 500; }
.ws-status.pass { color: #22C55E; } .ws-status.fail { color: #EF4444; }
.ws-time { color: var(--text-muted); font-size: 10px; }

/* Contact form */
.contact-card { background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 32px; }
.contact-submit { height: 48px !important; font-size: 15px !important; font-weight: 600 !important; }
</style>
