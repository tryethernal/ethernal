const CopyPlugin = require("copy-webpack-plugin");
const WorkerPlugin = require('worker-plugin');
process.env.VUE_APP_VERSION = process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(-5) : '/';

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
        devServer: {
            host: '0.0.0.0',
            hot: true,
            disableHostCheck: true,
            allowedHosts: ['app.ethernal.local', '.ethernal.explorer']
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './_redirects', to: './' }
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
