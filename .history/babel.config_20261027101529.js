module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        [
          'babel-preset-expo',
          {
            jsxPragma: 'React',
            unstable_transformImportMeta: true,
          },
        ],
      ],
      // The 'expo-router/babel' plugin is no longer needed and should be removed.
    };
  };