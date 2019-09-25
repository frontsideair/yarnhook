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
  ["yarn", "yarn.lock"],
  ["npm", "npm-shrinkwrap.json"],
  ["npm", "package-lock.json"],
  ["pnpm", "shrinkwrap.yaml"],
  ["pnpm", "pnpm-lock.yaml"]
];

const args = {
  yarn: ["install", "--prefer-offline", "--pure-lockfile"],
  npm: ["install", "--prefer-offline", "--no-audit", "--no-save"],
  pnpm: ["install", "--prefer-offline", "--prefer-frozen-shrinkwrap"]
};

function getLockfileSpec(currentDir) {
  for (let [cmd, lockfile] of lockfileSpecs) {
    const lockfilePath = join(currentDir, lockfile);
    if (fs.existsSync(lockfilePath)) {
      return { cmd, lockfilePath };
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
    const { cmd, lockfilePath } = lockfileSpec;

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
          `Changes to lockfile found, you should run \`${cmd} install\` if you want to have dependencies of this branch.`
        );
      } else {
        console.log(`Changes to lockfile found, running \`${cmd} install\``);
        try {
          execa.sync(cmd, args[cmd], { stdio: "inherit" });
        } catch (err) {
          console.warn(`Running ${cmd} ${args[cmd].join(' ')} failed`);
        }
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
