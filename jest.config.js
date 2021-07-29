module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  setupFiles: ["./tests/setup.js"],
  transformIgnorePatterns: ['/node_modules/(?!vuetify|vue)']
}
