<template>
    <section class="opensource-section">
        <v-container style="max-width: 1200px;">
            <v-row align="center">
                <v-col cols="12" md="6">
                    <h2 class="font-heading mb-4" :style="{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }">
                        Built in the open.<br><span class="gradient-text">MIT licensed.</span>
                    </h2>
                    <p class="mb-8" :style="{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '440px', fontSize: '1.05rem' }">
                        Ethernal is fully open source. Fork it, extend it, self-host it.
                        No vendor lock-in, no hidden fees.
                    </p>
                    <div class="d-flex ga-3 flex-wrap">
                        <v-btn
                            size="large"
                            class="btn-primary"
                            href="https://github.com/tryethernal/ethernal"
                            target="_blank"
                            rel="noopener noreferrer"
                            rounded="lg"
                        >
                            <svg fill="currentColor" height="18" width="18" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="mr-2">
                                <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/>
                            </svg>
                            View on GitHub
                        </v-btn>
                        <v-btn
                            size="large"
                            class="btn-outline"
                            href="https://doc.tryethernal.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            rounded="lg"
                        >
                            Read the Docs
                        </v-btn>
                    </div>
                </v-col>

                <v-col cols="12" md="6">
                    <div class="terminal-card">
                        <div class="terminal-header">
                            <div class="d-flex ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="terminal-title">bash &mdash; ethernal</div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="terminal-body">
                            <div><span class="comment"># Clone &amp; start in under a minute</span></div>
                            <div><span class="prompt">$ </span><span class="command">git clone https://github.com/tryethernal/ethernal.git</span></div>
                            <div><span class="prompt">$ </span><span class="command">cd ethernal</span></div>
                            <div><span class="prompt">$ </span><span class="command">make start</span></div>
                            <div class="mt-3"><span class="comment"># That's it. Your explorer is running.</span></div>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<script setup>
</script>

<style scoped>
.opensource-section {
    padding: 100px 0;
    border-top: 1px solid var(--drawer-divider);
    border-bottom: 1px solid var(--drawer-divider);
    background: var(--bg-base);
}

@media (max-width: 960px) {
    .opensource-section {
        padding: 60px 0;
    }
}

.terminal-title {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
</style>
