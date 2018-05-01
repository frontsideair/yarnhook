#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const execa = require("execa");
const { join } = require("path");
const fs = require("fs");

// environment variables
const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false, YARNHOOK_DRYRUN = false } = process.env;

// supported package managers and lockfile names
const lockfileSpecs = [
  { command: "lerna", subcommand: "bootstrap", lockfileName: "lerna.json" },
  { command: "yarn", subcommand: "install", lockfileName: "yarn.lock" },
  { command: "npm", subcommand: "install", lockfileName: "npm-shrinkwrap.json" },
  { command: "npm", subcommand: "install", lockfileName: "package-lock.json" },
  { command: "pnpm", subcommand: "install", lockfileName: "shrinkwrap.yaml" }
];

function getLockfileSpec(currentDir) {
  for (let { command, subcommand, lockfileName } of lockfileSpecs) {
    const lockfilePath = join(currentDir, lockfileName);
    if (fs.existsSync(lockfilePath)) {
      return { command, subcommand, lockfilePath };
    }
  }

  return null;
}

if (!YARNHOOK_BYPASS) {
  // find directories
  const currentDir = process.cwd();
  const gitDir = findParentDir.sync(currentDir, ".git");

  // check for lockfiles
  const lockfileSpec = getLockfileSpec(currentDir);

  if (YARNHOOK_DEBUG) {
    console.log("currentDir:", currentDir);
    console.log("gitDir:", gitDir);
    console.log("lockfile:", lockfileSpec);
  }

  if (lockfileSpec !== null) {
    // get the command and lockfile path
    const { command, subcommand, lockfilePath } = lockfileSpec;

    // run a git diff on the lockfile
    const { stdout: output } = execa.sync(
      "git",
      ["diff", "HEAD@{1}..HEAD@{0}", "--", lockfilePath],
      { cwd: gitDir }
    );

    if (YARNHOOK_DEBUG) {
      console.log(output);
    }

    // if diff exists, update dependencies
    if (output.length > 0) {
      if (YARNHOOK_DRYRUN) {
        console.log(
          `Changes to lockfile found, you should run \`${command} ${subcommand}\` if you want to have dependencies of this branch.`
        );
      } else {
        console.log(`Changes to lockfile found, running \`${command} ${subcommand}\``);
        execa.sync(command, [subcommand], { stdio: "inherit" });
      }
    }
  } else {
    console.log(
      "I can't seem to find a lockfile. Currently supported lockfiles are: yarn.lock, package-lock.json and shrinkwrap.yaml. Please " +
        "open an issue at https://github.com/frontsideair/yarnhook/issues if " +
        "you think it's my fault."
    );
  }
}
