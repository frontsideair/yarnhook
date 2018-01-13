#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const execa = require("execa");
const { join } = require("path");
const fs = require("fs");

const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false } = process.env;

if (!YARNHOOK_BYPASS) {
  // switch to gitdir
  const currentDir = process.cwd();
  const gitDir = findParentDir.sync(currentDir, ".git");
  const yarnLockPath = join(currentDir, "yarn.lock");
  const npmLockPath = join(currentDir, "package-lock.json");
  const pnpmLockPath = join(currentDir, "shrinkwrap.yaml");

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

    // get pnpm's lockfile
    if (fs.existsSync(pnpmLockPath)) {
      CMD = "pnpm";
      return pnpmLockPath;
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
    const { stdout: output } = execa.sync("git", ["diff", "HEAD@{1}..HEAD@{0}", "--", lockfile], {
      cwd: gitDir
    });

    if (YARNHOOK_DEBUG) {
      console.log(output, output.length > 0);
    }

    // if diff exists, update dependencies
    if (output.length > 0) {
      console.log(`Changes to lockfile found, running \`${CMD} install\``);
      execa.sync(CMD, ["install"], { stdio: "inherit" });
    }
  } else {
    console.log(
      "I can't seem to find a lockfile. Currently supported lockfiles are: yarn.lock, package-lock.json and shrinkwrap.yaml. Please " +
        "open an issue at https://github.com/frontsideair/yarnhook/issues if " +
        "you think it's my fault."
    );
  }
}
