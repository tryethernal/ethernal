<template>
    <v-dialog v-model="dialog" max-width="600">
        <v-card>
            <v-card-title>
                <template>DNS Setup Info</template>
                <v-spacer></v-spacer>
                <v-btn icon @click="close()" ><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <v-list>
                    <v-list-item>
                        Last updated {{ dnsStatus.last_monitored_humanized }}:
                    </v-list-item>
                    <v-list-item>
                        <v-tooltip location="top">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" :class="{ 'mr-1': true, 'success--text': dnsStatus.apx_hit, 'error--text': !dnsStatus.apx_hit }">{{ dnsStatus.apx_hit ? 'mdi-check' : 'mdi-close' }}</v-icon> APX Hits
                            </template>
                            <span v-if="dnsStatus.apx_hit">Requests to this address are reaching our servers.</span>
                            <span v-else>Requests are not reaching our servers. Usually this means that this address does not have a DNS record pointing at our servers.</span>
                        </v-tooltip>
                    </v-list-item>
                    <v-list-item>
                        <v-tooltip location="top">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" :class="{ 'mr-1': true, 'success--text': dnsStatus.hasDnsRecord, 'error--text': !dnsStatus.hasDnsRecord }">{{ dnsStatus.hasDnsRecord ? 'mdi-check' : 'mdi-close' }}</v-icon> DNS
                            </template>
                            <span v-if="dnsStatus.hasDnsRecord">We found a DNS record that's pointed at our servers.</span>
                            <span v-else>We currently can't find a DNS record pointed at our servers, though it could still be propagating. This can be fixed by adding/replacing an A or CNAME record pointing at our servers.</span>
                        </v-tooltip>
                    </v-list-item>
                    <v-list-item>
                        <v-tooltip location="top">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" :class="{ 'mr-1': true, 'success--text': dnsStatus.is_resolving, 'error--text': !dnsStatus.is_resolving }">{{ dnsStatus.is_resolving ? 'mdi-check' : 'mdi-close' }}</v-icon> Resolving requests
                            </template>
                            <span v-if="dnsStatus.is_resolving">Requests to this domain are returning a response.</span>
                            <span v-else>Requests to this domain are not returning a response. Make sure you've setup the correct A record.</span>
                        </v-tooltip>
                    </v-list-item>
                    <v-list-item>
                        <v-tooltip location="top">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" :class="{ 'mr-1': true, 'success--text': dnsStatus.has_ssl, 'error--text': !dnsStatus.has_ssl }">{{ dnsStatus.has_ssl ? 'mdi-check' : 'mdi-close' }}</v-icon> SSL active
                            </template>
                            <span v-if="dnsStatus.has_ssl">This domain is secured by SSL.</span>
                            <span v-else>
                                This domain doesn't appear to be secured by SSL.<br>
                                This could be due to the domain being unreachable, incorrect DNS records, or having no DNS records at all.<br>
                                If you just added this domain, it may take a bit of time to become secured. No responses will be returned in the meantime to ensure security. </span>
                        </v-tooltip>
                    </v-list-item>
                </v-list>
                <div class="mb-1">Log in to the account you have with your DNS provider, and add the following record:</div>
                <div style="border-radius: 5px;" class="pa-2 bg-black text-white font-weight-medium">{{ domainOrigin }} A 37.16.1.34</div>
                <div class="text-caption" v-if="dnsStatus.dns_pointed_at">Current DNS: {{ dnsStatus.dns_pointed_at }}</div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>

export default {
    name: 'ExplorerDomainDNSInfoModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        domain: null,
        dnsStatus: {}
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.domain = options.domain;
            this.dnsStatus = options.dnsStatus;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve();
            this.dialog = false;
        }
    },
    computed: {
        domainOrigin() {
            try {
                if (this.domain.startsWith('http://') || this.domain.startsWith('https://'))
                    return null;
                const url = new URL(`https://${this.domain}`);
                return url.host;
            } catch(error) {
                return null
            }
        },
        hasDnsRecord() {
            return this.dnsStatus.dns_pointed_at == '37.16.1.34';
        }
    }
}
</script>
