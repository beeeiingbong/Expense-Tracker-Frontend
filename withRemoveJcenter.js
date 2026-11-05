const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withRemoveJcenter(config) {
  return withProjectBuildGradle(config, (config) => {
    // Completely remove any line calling jcenter() with regex string matching
    if (config.modResults.contents.includes("jcenter()")) {
      config.modResults.contents = config.modResults.contents.replace(
        /jcenter\(\)/g,
        "// removed jcenter",
      );
    }
    return config;
  });
};
