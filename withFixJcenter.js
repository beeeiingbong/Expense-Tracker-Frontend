const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withFixJcenter(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // This block is injected into the root build.gradle.
    // It runs before any subproject is evaluated and maps the non-existent jcenter() method to mavenCentral()
    const fallbackScript = `
allprojects {
    beforeEvaluate { proj ->
        proj.repositories.ext.jcenter = { -> proj.repositories.mavenCentral() }
        proj.buildscript.repositories.ext.jcenter = { -> proj.buildscript.repositories.mavenCentral() }
    }
}
`;

    if (!contents.includes("proj.repositories.ext.jcenter")) {
      config.modResults.contents = fallbackScript + "\n" + contents;
    }

    return config;
  });
};
