module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    configureWebpack: {
        externals: {
            fsevents: "require('fsevents')",
            'fs-extra': '{}'
        }
    }
}