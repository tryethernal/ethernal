const CopyPlugin = require("copy-webpack-plugin");
process.env.VUE_APP_VERSION = process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(-5) : '/';

module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
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
