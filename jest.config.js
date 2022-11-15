module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  setupFiles: ["./tests/setup.js"],
  transformIgnorePatterns: ['/node_modules/(?!vuetify|vue)'],
  restoreMocks: true,
  clearMocks: true,
  resetMocks: true,
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/tests/unit/mocks/styles.js',
  }
}
