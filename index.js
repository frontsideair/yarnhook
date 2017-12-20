#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const { execSync } = require("child_process");
const { join } = require("path");
const fs = require("fs");

const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false } = process.env;

if (!YARNHOOK_BYPASS) {
  // switch to gitdir
  const currentDir = process.cwd();
  const gitDir = findParentDir.sync(currentDir, ".git");
  const yarnLockPath = join(currentDir, "yarn.lock");
  const npmLockPath = join(currentDir, "package-lock.json");

  // check for yarn's and npm's lockfiles
  let CMD = "";
  const getLockfile = function() {
    // get yarn's lockfile
    if (fs.existsSync(yarnLockPath)) {
      CMD = "yarn";
      return yarnLockPath;
    }

    // get npm's lockfile
    if (fs.existsSync(npmLockPath)) {
      CMD = "npm";
      return npmLockPath;
    }

    return null;
  };

  const lockfile = getLockfile();

  if (YARNHOOK_DEBUG) {
    console.log("currentDir:", currentDir);
    console.log("gitDir:", gitDir);
    console.log("lockfile:", lockfile);
    console.log("CMD:", CMD);
  }

  if (lockfile !== null) {
    // run a git diff on the lockfile
    const output = execSync(`git diff HEAD@{1}..HEAD@{0} -- ${lockfile}`, {
      cwd: gitDir,
      encoding: "utf-8"
    });

    if (YARNHOOK_DEBUG) {
      console.log(output, output.length > 0);
    }

    // if diff exists, update dependencies
    if (output.length > 0) {
      console.log(`Changes to lockfile found, running \`${CMD} install\``);
      const output = execSync(`${CMD} install`, { encoding: "utf-8" });
      console.log(output);
    }
  } else {
    console.log(
      "I can't seem to find either yarn.lock or package-lock.json. Please " +
        "open an issue at https://github.com/frontsideair/yarnhook/issues if " +
        "you think it's my fault."
    );
  }
}
