// metro.config.cjs
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to prefer CommonJS "main" fields over ESM "exports" fields.
// This makes packages ship their CJS build (which never uses `import.meta`)
// instead of their ESM build (which sometimes does).
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;