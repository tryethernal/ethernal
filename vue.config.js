const CopyPlugin = require("copy-webpack-plugin");
const WorkerPlugin = require('worker-plugin');

module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    chainWebpack: config => {
        config
            .plugin('html')
            .tap(args => {
                return [{
                    feedbackFinEndpoint: process.env.VUE_APP_FEEDBACK_FIN_ENDPOINT,
                    feedbackDomain: process.env.VUE_APP_MAIN_DOMAIN,
                    isProduction: process.env.NODE_ENV == 'production',
                    ...args['0']
                }];
            })
    },
    configureWebpack: {
        devtool: "source-map",
        devServer: {
            host: '0.0.0.0',
            port: 8080,
            public: 'app.ethernal.local:8080',
            hot: true,
            disableHostCheck: true,
            allowedHosts: ['app.ethernal.local', '.ethernal.explorer'],
            headers: {
                'Document-Policy': 'js-profiling'
            },
            proxy: {
                '/api/[1-9]\\d*/(envelope|minidump|security|store)/': { target: process.env.SENTRY_URL }
            }
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './_redirects', to: './' },
                    { from: './_headers', to: './' }
                ]
            }),
            new WorkerPlugin()
        ],
        externals: {
            fsevents: "require('fsevents')",
            'fs-extra': '{}'
        }
    }
}
