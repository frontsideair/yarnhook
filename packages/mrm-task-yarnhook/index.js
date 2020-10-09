const { install, packageJson } = require("mrm-core");

function task() {
  const pkg = packageJson();

  pkg
    .merge({
      husky: {
        hooks: {
          "post-checkout": "yarnhook",
          "post-merge": "yarnhook",
          "post-rewrite": "yarnhook"
        }
      }
    })
    .save();

  install({
    yarnhook: ">=0.4.3",
    husky: ">=4"
  });
}

task.description = "Adds yarnhook";
module.exports = task;
