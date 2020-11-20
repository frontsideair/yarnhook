#!/usr/bin/env node

// @flow

const execa = require("execa");
const fs = require("fs");
const packageJson = require("./package.json");

// environment variables
const { YARNHOOK_BYPASS, YARNHOOK_DEBUG, YARNHOOK_DRYRUN } = process.env;

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

function getLockfileSpec() {
  for (const lockfileSpec of lockfileSpecs) {
    if (fs.existsSync(lockfileSpec.checkfile)) {
      return lockfileSpec;
    }
  }
}

function diff(hook, gitParams, lockfilePath) {
  let range;
  switch (hook) {
    // Triggered by: checkout, switch, rebase, pull (rebase)
    // See: https://git-scm.com/docs/githooks#_post_checkout
    // NOTE: git-rebase has two backends: apply and merge. Both backends call
    // post-checkout hook, although merge backend doesn't show the output.
    // This behavior may change in the future, but for now it's the only way
    // to do this since we don't want to run it twice on `git pull --rebase`.
    // Read more: https://git-scm.com/docs/git-rebase#_hooks
    case "post-checkout":
      const [previousHead, currentHead, isBranchCheckout] = gitParams;
      range = `${previousHead}..${currentHead}`;
      break;
    // Triggered by: merge, pull (merge)
    // See: https://git-scm.com/docs/githooks#_post_merge
    case "post-merge":
      const [isSquash] = gitParams;
      range = "HEAD@{1}..HEAD@{0}";
      break;
    default:
      // backwards compatibility or fail
      process.exit(1);
  }
  const gitDiffParams = ["diff", "--name-only", range, "--", lockfilePath];
  debug("Running `git diff` with params:", gitDiffParams);
  const { stdout: output } = execa.sync("git", gitDiffParams);
  return output;
}

function debug(...args) {
  if (YARNHOOK_DEBUG) {
    console.log("YARNHOOK:", ...args);
  }
}

function log(...args) {
  console.log(...args);
}

function error(...args) {
  console.error(...args);
}

function main() {
  if (!YARNHOOK_BYPASS) {
    const [, , hook, ...gitParams] = process.argv;
    debug(`Running on ${hook} hook with params:`, gitParams);
    const lockfileSpec = getLockfileSpec();
    if (lockfileSpec) {
      const { lockfile, command, arguments } = lockfileSpec;
      debug(`Lockfile ${lockfile} detected, inferring package manager ${command}.`);
      const output = diff(hook, gitParams, lockfile);
      if (output.length > 0) {
        if (YARNHOOK_DRYRUN) {
          log(
            `Changes to ${lockfile} found, you should use ${command} to have up-to-date dependencies.`
          );
        } else {
          log(`Changes to ${lockfile} found, installing dependencies with ${command}`);
          try {
            execa.sync(command, arguments, { stdio: "inherit" });
          } catch (err) {
            error(`Running ${command} ${arguments.join(" ")} failed.`);
          }
        }
      } else {
        debug(`No changes were found to the lockfile ${lockfile}:`, output);
      }
    } else {
      const lockfiles = lockfileSpecs.map(spec => spec.lockfile).join(", ");
      error(
        `No known lockfiles in ${process.cwd()}. Currently supported lockfiles are: ${lockfiles}.`
      );
      error(`Please open an issue at ${packageJson.bugs.url} if you think it's a bug.`);
    }
  } else {
    debug(`Not running since YARNHOOK_BYPASS flag was on.`);
  }
}

main();
