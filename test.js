/*
- checkout branch test
- pull test
- pull (rebase) test
- npm, npm-shrinkwrap, yarn, pnpm tests
- ???

pull a yarnhook enabled repo
change to a branch with a different dependency
it should be installed
change back to the initial branch
it should be uninstalled

start with an old HEAD
perform a git pull
it should have the latest dependencies

it should work if pull.rebase=true
*/

const execa = require("execa");

const NEW_BRANCH = "new-branch";
const MAIN_BRANCH = "main";
const TIMEOUT = 60 * 1000;
const TEST_DIRECTORY = "test";

async function cmd(command, cwd = TEST_DIRECTORY) {
  const { stdout } = await execa.shell(command, { cwd });
  return stdout;
}

async function installYarnhook() {
  await cmd("npm install --save-dev yarnhook husky");
  await cmd(
    `npx json -I -f package.json -e 'this.husky={"hooks":{"post-checkout":"yarnhook","post-merge":"yarnhook","post-rewrite":"yarnhook"}}'`
  );
}

// dependencies: git (2.28), npx (node 8.2.0)
async function initialize() {
  await cmd(`mkdir ${TEST_DIRECTORY}`, ".");
  await cmd(`git init -b ${MAIN_BRANCH}`);
  await cmd("npm init --yes");
  await installYarnhook();
  await cmd(`echo "console.log(1)" > index.js`);
  await cmd("git add package.json package-lock.json index.js");
  await cmd(`git commit -m "Initial commit"`);
  await cmd(`git checkout -b ${NEW_BRANCH}`);
  await cmd("npm install --save number-zero");
  await cmd(`echo "console.log(require('number-zero'))" > index.js`);
  await cmd("git add package.json package-lock.json index.js");
  await cmd(`git commit -m "Add number-zero"`);
}

async function cleanup() {
  await cmd(`rm -rf ${TEST_DIRECTORY}`, ".");
}

beforeAll(initialize, TIMEOUT);

afterAll(cleanup, TIMEOUT);

beforeEach(async () => {
  await cmd(`git checkout ${MAIN_BRANCH}`);
});

describe("simple test", () => {
  it("should work on main branch", async () => {
    const output = await cmd("node index.js");
    expect(output).toBe("1");
  });

  it("should work on new branch", async () => {
    await cmd(`git checkout ${NEW_BRANCH}`);
    const output = await cmd("node index.js");
    expect(output).toBe("0");
  });
});
