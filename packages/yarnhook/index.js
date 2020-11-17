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
  {
    checkfile: ".yarnrc.yml",
    lockfile: "yarn.lock",
    command: "yarn",
    version: "2",
    arguments: ["install", "--immutable"]
  },
  {
    checkfile: "yarn.lock",
    lockfile: "yarn.lock",
    command: "yarn",
    version: "1",
    arguments: ["install", "--prefer-offline", "--pure-lockfile", "--ignore-optional"]
  },
  {
    checkfile: "package-lock.json",
    lockfile: "package-lock.json",
    command: "npm",
    version: ">=5",
    arguments: ["install", "--prefer-offline", "--no-audit", "--no-save", "--no-optional"]
  },
  {
    checkfile: "npm-shrinkwrap.json",
    lockfile: "npm-shrinkwrap.json",
    command: "npm",
    version: "<5",
    arguments: ["install", "--prefer-offline", "--no-audit", "--no-save", "--no-optional"]
  },
  {
    checkfile: "pnpm-lock.yaml",
    lockfile: "pnpm-lock.yaml",
    command: "pnpm",
    version: ">=3",
    arguments: ["install", "--prefer-offline", "--prefer-frozen-shrinkwrap", "--no-optional"]
  },
  {
    checkfile: "shrinkwrap.yaml",
    lockfile: "shrinkwrap.yaml",
    command: "pnpm",
    version: "<3",
    arguments: ["install", "--prefer-offline", "--prefer-frozen-shrinkwrap", "--no-optional"]
  }
];

function getLockfileSpec(currentDir) {
  for (let lockfileSpec of lockfileSpecs) {
    const checkfilePath = join(currentDir, lockfileSpec.checkfile);
    if (fs.existsSync(checkfilePath)) {
      return lockfileSpec;
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
    // get the command, arguments and lockfile path
    const { lockfile, command, arguments } = lockfileSpec;
    const lockfilePath = join(currentDir, lockfile);

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
          `Changes to lockfile found, you should run \`${command} install\` if you want to have up-to-date dependencies.`
        );
      } else {
        console.log(`Changes to lockfile found, running \`${command} install\``);
        try {
          execa.sync(command, arguments, { stdio: "inherit" });
        } catch (err) {
          console.warn(`Running ${command} ${arguments.join(" ")} failed`);
        }
      }
    }
  } else {
    const lockfiles = lockfileSpecs.map(spec => spec.lockfile).join(", ");
    console.warn(`I can't find a lockfile. Currently supported lockfiles are: ${lockfiles}.`);
    console.warn(`Please open an issue at ${packageJson.bugs.url} if you think it's a bug.`);
  }
}
