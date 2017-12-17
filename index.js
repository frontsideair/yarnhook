#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const { execSync } = require("child_process");
const { join } = require("path");

const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false } = process.env;

if (!YARNHOOK_BYPASS) {
  // switch to gitdir
  const currentDir = process.cwd();
  const gitDir = findParentDir.sync(currentDir, ".git");

  if (YARNHOOK_DEBUG) {
    console.log(currentDir, gitDir);
  }

  // run git diff HEAD@{1}..HEAD@{0} -- $CWD/yarn.lock
  const yarnLockPath = join(currentDir, "yarn.lock");
  const output = execSync(`git diff HEAD@{1}..HEAD@{0} -- ${yarnLockPath}`, {
    cwd: gitDir,
    encoding: "utf-8"
  });

  if (YARNHOOK_DEBUG) {
    console.log(output);
  }

  // if diff exists, run yarn install
  if (output.length > 0) {
    const output = execSync("yarn install", { encoding: "utf-8" });
    console.log(output);
  }
}
