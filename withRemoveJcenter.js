const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withRemoveJcenter(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const jcenterBypassScript = `
allprojects {
    repositories {
        metaClass.jcenter = { -> delegate.mavenCentral() }
    }
    buildscript {
        repositories {
            metaClass.jcenter = { -> delegate.mavenCentral() }
        }
    }
}
`;

    if (!contents.includes("metaClass.jcenter")) {
      config.modResults.contents = jcenterBypassScript + "\n" + contents;
    }

    return config;
  });
};
