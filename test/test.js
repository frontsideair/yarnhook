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

function cmd(command) {
  return execa.shell(command, { cwd: "./test" });
}

async function initialize() {
  await cmd("git init -b main");
  await cmd("npm init --yes");
  await cmd("npm install --save-dev yarnhook husky");
  await cmd(
    `npx json -I -f package.json -e 'this.husky={"hooks":{"post-checkout":"yarnhook","post-merge":"yarnhook","post-rewrite":"yarnhook"}}'`
  );
  await cmd(`echo "console.log(0)" > index.js`);
  await cmd("git add package.json package-lock.json index.js");
  await cmd(`git commit -m "Initial commit"`);
  await cmd("git checkout -b new-branch");
  await cmd("npm install --save number-zero");
  await cmd(`echo "console.log(require('number-zero'))" > index.js`);
  await cmd("git add package.json package-lock.json index.js");
  await cmd(`git commit -m "Add number-zero"`);
}

async function cleanup() {
  await cmd("rm -r .git package.json package-lock.json node_modules index.js");
}

const TIMEOUT = 60 * 1000;

beforeAll(initialize, TIMEOUT);
afterAll(cleanup, TIMEOUT);
beforeEach(async () => {
  await cmd("git checkout main");
});

describe("tests", async () => {
  test("test", async () => {
    const { stdout: output } = await cmd("node index.js");
    expect(output).toBe("0");
  });

  test("test2", async () => {
    await cmd("git checkout new-branch");
    const { stdout: output } = await cmd("node index.js");
    expect(output).toBe("0");
  });
});
