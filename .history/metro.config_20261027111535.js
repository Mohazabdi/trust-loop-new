// metro.config.js — Metro loads .js fine even with "type": "module"
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force CommonJS builds for packages that emit `import.meta` on web
const FORCE_CJS = [
  'axios',
  'uuid',
  '@supabase/supabase-js',
  '@supabase/auth-js',
  '@supabase/postgrest-js',
  '@supabase/realtime-js',
  '@supabase/storage-js',
  '@tanstack/query-core',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    for (const pkg of FORCE_CJS) {
      if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
        // Ask Node to resolve the package.json's "main" (CJS) entry
        const pkgJsonPath = require.resolve(`${pkg}/package.json`, {
          paths: [context.originModulePath || __dirname, __dirname],
        });
        const pkgJson = require(pkgJsonPath);
        const mainField = pkgJson.main || 'index.js';
        const cjsEntry = path.join(path.dirname(pkgJsonPath), mainField);
        return { filePath: cjsEntry, type: 'sourceFile' };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;