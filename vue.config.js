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
                    enableAnalytics: !!process.env.VUE_APP_ENABLE_ANALYTICS,
                    enableFeedback: !!process.env.VUE_APP_ENABLE_FEEDBACK,
                    ...args
                }['0']];
            })
    },
    configureWebpack: {
        // module: {
        //     rules: [
        //         {
        //             test: /\.worker\.js$/,
        //             use: {
        //                 loader: "worker-loader",
        //                 options: {
        //                     inline: "fallback",
        //                 }
        //             }
        //         }
        //     ]
        // },
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
