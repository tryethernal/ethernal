<template>
    <section class="landing-section">
        <v-container style="max-width: 1200px;">
            <div class="text-center mb-12">
                <h2 class="font-heading mb-4" :style="{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }">
                    Full <span class="gradient-text">L2 bridge</span> visibility
                </h2>
                <p :style="{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7, fontSize: '1.05rem' }">
                    Track deposits, withdrawals, and batches across your rollup. Set up in under 2 minutes.
                </p>
            </div>

            <v-row justify="center">
                <v-col cols="12" sm="6" md="4">
                    <router-link to="/arbitrum-orbit" class="l2-card-link">
                        <div class="l2-card">
                            <div class="l2-card-icon orbit">
                                <v-icon size="28" color="#3D95CE">mdi-transit-connection-variant</v-icon>
                            </div>
                            <h3 class="l2-card-title">Arbitrum Orbit</h3>
                            <p class="l2-card-desc">Deposit tracking, withdrawal claims, batch monitoring, and full transaction lifecycle for Orbit chains.</p>
                            <span class="l2-card-action">Learn more <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon></span>
                        </div>
                    </router-link>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                    <router-link to="/op-stack" class="l2-card-link">
                        <div class="l2-card">
                            <div class="l2-card-icon op">
                                <v-icon size="28" color="#EF4444">mdi-layers-triple</v-icon>
                            </div>
                            <h3 class="l2-card-title">OP Stack</h3>
                            <p class="l2-card-desc">Deposits, withdrawals with 7-day challenge period, blob and calldata batches, and fault proof tracking.</p>
                            <span class="l2-card-action">Learn more <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon></span>
                        </div>
                    </router-link>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                    <div class="l2-card l2-card-coming">
                        <div class="l2-card-icon coming">
                            <v-icon size="28" color="#64748B">mdi-plus-circle-outline</v-icon>
                        </div>
                        <h3 class="l2-card-title">More Coming</h3>
                        <p class="l2-card-desc">ZK rollups and other L2 frameworks are on the roadmap. Need support for a specific stack? Let us know.</p>
                        <router-link to="/contact-us" class="l2-card-action">Request a stack <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon></router-link>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<style scoped>
.l2-card-link {
    text-decoration: none;
    display: block;
    height: 100%;
}

.l2-card {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 32px 28px;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.l2-card:hover {
    border-color: rgba(61, 149, 206, 0.4);
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);
}

.l2-card-coming {
    border-style: dashed;
    border-color: rgba(100, 116, 139, 0.3);
}

.l2-card-coming:hover {
    border-color: rgba(100, 116, 139, 0.5);
    box-shadow: none;
    transform: translateY(-2px);
}

.l2-card-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.l2-card-icon.orbit { background: rgba(61, 149, 206, 0.1); }
.l2-card-icon.op { background: rgba(239, 68, 68, 0.1); }
.l2-card-icon.coming { background: rgba(100, 116, 139, 0.1); }

.l2-card-title {
    font-family: 'Exo', sans-serif;
    font-weight: 600;
    font-size: 1.15rem;
    color: var(--text-primary);
    margin-bottom: 10px;
}

.l2-card-desc {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
    flex-grow: 1;
    margin-bottom: 16px;
}

.l2-card-action {
    color: #5DAAE0;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    transition: color 0.2s;
}

.l2-card-action:hover { color: #8BC4E8; }
</style>
