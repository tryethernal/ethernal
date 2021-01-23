const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    configureWebpack: {
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