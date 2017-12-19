#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const { execSync } = require("child_process");
const { join } = require("path");
const fs = require('fs');

const { LOCKFILEHOOK_BYPASS = false, LOCKFILEHOOK_DEBUG = false } = process.env;

if (!LOCKFILEHOOK_BYPASS) {
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
  }

  const lockfile = getLockfile();

  if (LOCKFILEHOOK_DEBUG) {
    console.log('currentDir:', currentDir);
    console.log('gitDir:', gitDir);
    console.log('lockfile:', lockfile);
    console.log('CMD:', CMD);
  }

  // run a git diff on the lockfile
  const output = execSync(`git diff HEAD@{1}..HEAD@{0} -- ${lockfile}`, {
    cwd: gitDir,
    encoding: "utf-8"
  });

  if (LOCKFILEHOOK_DEBUG) {
    console.log(output, output.length > 0);
  }

  // if diff exists, update dependencies
  if (output.length > 0) {
    console.log(`Changes to lockfile found, running \`${CMD} install\``);
    const output = execSync(`${CMD} install`, { encoding: "utf-8" });
    console.log(output);
  }
}
