const CopyPlugin = require("copy-webpack-plugin");
const WorkerPlugin = require('worker-plugin');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");
process.env.VUE_APP_VERSION = process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(-5) : '/';
process.env.VUE_COMMIT_REF = process.env.COMMIT_REF;

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
            }
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './_redirects', to: './' }
                ]
            }),
            new WorkerPlugin(),
            sentryWebpackPlugin({
                authToken: process.env.SENTRY_AUTH_TOKEN,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
            })
        ],
        externals: {
            fsevents: "require('fsevents')",
            'fs-extra': '{}'
        }
    }
}
