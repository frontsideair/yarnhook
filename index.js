#!/usr/bin/env node

// @flow

const { join, dirname } = require("path");
const fs = require("fs");
const findParentDir = require("find-parent-dir");
const execa = require("execa");
const LernaProject = require("@lerna/project");

// environment variables
const { YARNHOOK_BYPASS = false, YARNHOOK_DEBUG = false, YARNHOOK_DRYRUN = false } = process.env;

if (YARNHOOK_BYPASS) {
  console.log("Yarnhook bypassed");
  process.exit(0);
}

const supportedPackageManagers = ["yarn", "npm", "pnpm"];

// supported package managers and lockfile names
const lockfileSpecs = [
  ["yarn", "yarn.lock"],
  ["npm", "npm-shrinkwrap.json"],
  ["npm", "package-lock.json"],
  ["pnpm", "shrinkwrap.yaml"]
];

const args = {
  yarn: ["install", "--prefer-offline", "--pure-lockfile"],
  npm: ["install", "--prefer-offline", "--no-audit"],
  pnpm: ["install", "--prefer-offline", "--prefer-frozen-shrinkwrap"]
};

function readAndParseJson(currentDir, path) {
  const packageJsonPath = join(currentDir, path);
  if (!fs.existsSync(packageJsonPath)) return null;
  const jsonString = fs.readFileSync(packageJsonPath, "utf-8");

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.log(`Could not parse ${path}: ${err.message}`);
    process.exit(0);
  }
}

function getLockfilePath(dir, lockfileSpecs) {
  for (let [cmd, lockfile] of lockfileSpecs) {
    const lockfilePath = join(dir, lockfile);
    if (fs.existsSync(lockfilePath)) {
      return lockfilePath;
    }
  }

  return null;
}
function getLockfileSpec(dir, lockfileSpecs) {
  for (let [cmd, lockfile] of lockfileSpecs) {
    const lockfilePath = join(dir, lockfile);
    if (fs.existsSync(lockfilePath)) {
      return { cmd, args: args[cmd], lockfilePaths: [lockfilePath] };
    }
  }

  return null;
}

function getRootLockfileSpec(currentDir) {
  return getLockfileSpec(currentDir, lockfileSpecs);
}

async function getLockfilesSpecs(currentDir) {
  const packageJson = readAndParseJson(currentDir, "package.json");

  // Yarn workspaces are supported without any additional code: all dependencies are in the root yarn.lock
  // There is also lernaJson.useWorkspaces, but it is not required to set it to make yarn workspaces work with lerna.
  if (packageJson.workspaces) {
    return [getRootLockfileSpec(currentDir)];
  }

  /* monorepos */

  const lernaProject = new LernaProject(currentDir);

  // if there is no lerna config, there is no throws. However it should always have a version, so we can use that.
  if (lernaProject.version) {
    const lernaPackageManager = lernaProject.config.npmClient || "npm";
    const filteredLockfileSpecs = lockfileSpecs.filter(
      ([packageManager]) => packageManager === lernaPackageManager
    );

    const lockfilePaths = (await lernaProject.fileFinder("package.json", null)).map(
      packageJsonPath => getLockfilePath(dirname(packageJsonPath), filteredLockfileSpecs)
    );
    console.log(lockfilePaths);

    return [
      // root package.json
      getLockfileSpec(currentDir, filteredLockfileSpecs),
      // children package.json
      {
        cmd: "lerna",
        args: ["bootstrap", "--"].concat(args[lernaPackageManager].slice(1)),
        lockfilePaths
      }
    ];
  }

  return [rootLockfileSpec];
}

(async () => {
  // find directories
  const currentDir = process.cwd();
  const gitDir = findParentDir.sync(currentDir, ".git");

  // check for lockfiles
  const lockfilesSpecs = await getLockfilesSpecs(currentDir);

  if (YARNHOOK_DEBUG) {
    console.log("currentDir:", currentDir);
    console.log("gitDir:", gitDir);
    console.log("lockfilesSpecs:", lockfilesSpecs);
  }

  if (lockfilesSpecs.length === 0) {
    console.log(
      "I can't seem to find a lockfile. Currently supported lockfiles are: yarn.lock, package-lock.json and shrinkwrap.yaml. Please " +
        "open an issue at https://github.com/frontsideair/yarnhook/issues if " +
        "you think it's my fault."
    );
    process.exit(0);
  }

  lockfilesSpecs.forEach(lockfilesSpec => {
    // get the command and lockfile path
    const { cmd, args, lockfilePaths } = lockfilesSpec;

    // run a git diff on the lockfile
    const { stdout: output } = execa.sync(
      "git",
      ["diff", "HEAD@{1}..HEAD@{0}", "--", ...lockfilePaths],
      { cwd: gitDir }
    );

    // if diff exists, update dependencies
    if (output.length > 0) {
      const readableCommand = `${cmd} ${args.join(" ")}`;
      if (YARNHOOK_DRYRUN) {
        console.log(
          `Changes to lockfile found, you should run \`${readableCommand}\` if you want to have dependencies of this branch.`
        );
      } else {
        console.log(`Changes to lockfile found, running \`${readableCommand}\``);
        try {
          execa.sync(cmd, args, { stdio: "inherit" });
        } catch (err) {
          console.warn(`Running \`${readableCommand}\` failed`);
        }
      }
    }
  });
})().catch(err => {
  console.error(err);
  process.exit(1);
});
