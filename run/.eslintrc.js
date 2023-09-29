module.exports = {
    root: true,
    env: {
      es6: true,
      node: true,
      jest: true,
    },
    extends: [
      "eslint:recommended",
    ],
    rules: {
      quotes: [2, "single"],
    },
    parserOptions: {
      ecmaVersion: 8
    }
};
