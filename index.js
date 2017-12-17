// @flow

const findParentDir = require("find-parent-dir");
const { execSync } = require("child_process");

// switch to gitdir
const currentDir = process.cwd();
const gitDir = findParentDir.sync(currentDir, ".git");
console.log(currentDir, gitDir);

// run git diff HEAD@{1}..HEAD@{0} -- $CWD/yarn.lock
const output = execSync("git diff HEAD@{1}..HEAD@{0} -- yarn.lock", {
  cwd: gitDir,
  encoding: "utf-8"
});
console.log(output);

// if diff exists, run yarn install
if (output.length > 0) {
  execSync("yarn install");
}
