#!/usr/bin/env node

// @flow

const findParentDir = require("find-parent-dir");
const execa = require("execa");
const { join } = require("path");
const fs = require("fs");
const packageJson = require("./package.json");

// environment variables
const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false, YARNHOOK_DRYRUN = false } = process.env;

// supported package managers and lockfile names
const lockfileSpecs = [
  ["yarn2", ".yarnrc.yml"],
  ["yarn", "yarn.lock"],
  ["npm", "npm-shrinkwrap.json"],
  ["npm", "package-lock.json"],
  ["pnpm", "shrinkwrap.yaml"],
  ["pnpm", "pnpm-lock.yaml"]
];

const args = {
  yarn2: ["yarn", ["install", "--immutable"]],
  yarn: ["yarn", ["install", "--prefer-offline", "--pure-lockfile", "--ignore-optional"]],
  npm: ["npm", ["install", "--prefer-offline", "--no-audit", "--no-save", "--no-optional"]],
  pnpm: ["pnpm", ["install", "--prefer-offline", "--prefer-frozen-shrinkwrap", "--no-optional"]]
};

function getLockfileSpec(currentDir) {
  for (let [pm, lockfile] of lockfileSpecs) {
    const lockfilePath = join(currentDir, lockfile);
    if (fs.existsSync(lockfilePath)) {
      const [cmd, arg] = args[pm];
      return { cmd, arg, lockfilePath };
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
    const { cmd, arg, lockfilePath } = lockfileSpec;

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
          `Changes to lockfile found, you should run \`${cmd} install\` if you want to have up-to-date dependencies.`
        );
      } else {
        console.log(`Changes to lockfile found, running \`${cmd} install\``);
        try {
          execa.sync(cmd, arg, { stdio: "inherit" });
        } catch (err) {
          console.warn(`Running ${cmd} ${args[cmd].join(" ")} failed`);
        }
      }
    }
  } else {
    const lockfiles = lockfileSpecs.map(spec => spec[1]).join(", ");
    console.warn(`I can't find a lockfile. Currently supported lockfiles are: ${lockfiles}.`);
    console.warn(`Please open an issue at ${packageJson.bugs.url} if you think it's a bug.`);
  }
}
