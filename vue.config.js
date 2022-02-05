const CopyPlugin = require("copy-webpack-plugin");
process.env.VUE_APP_VERSION = process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(-5) : '/';

module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    chainWebpack: config => {
        config
            .plugin('html')
            .tap(args => {
                args[0]['enableAnalytics'] = !!process.env.VUE_APP_ENABLE_ANALYTICS;
                args[0]['feedbackFishPid'] = process.env.VUE_APP_FEEDBACK_FISH_PID;
                return args;
            })
    },
    configureWebpack: {
        devServer: {
            public: 'antoine.local'
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: './_redirects', to: './' }
                ]
            })
        ],
        externals: {
            fsevents: "require('fsevents')",
            'fs-extra': '{}'
        }
    }
}
