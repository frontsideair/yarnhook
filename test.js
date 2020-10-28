const execa = require("execa");
const path = require("path");

const NEW_BRANCH = "new-branch";
const MAIN_BRANCH = "main";
const TEST_DIRECTORY = "test";
const REMOTE_REPO_PATH = path.join(TEST_DIRECTORY, "remote");
const LOCAL_REPO_PATH = path.join(TEST_DIRECTORY, "local");

jest.setTimeout(60 * 1000);

async function cmd(command, cwd) {
  const { stdout } = await execa.command(command, { cwd, shell: true });
  return stdout;
}

async function localCmd(command) {
  return cmd(command, LOCAL_REPO_PATH);
}

async function remoteCmd(command) {
  return cmd(command, REMOTE_REPO_PATH);
}

async function installYarnhook() {
  await remoteCmd("npm install --save-dev --package-lock-only ../../packages/yarnhook husky");
  await remoteCmd(
    `npx json -I -f package.json -e 'this.husky={"hooks":{"post-checkout":"yarnhook $HUSKY_GIT_PARAMS","post-merge":"yarnhook $HUSKY_GIT_PARAMS","post-rewrite":"yarnhook $HUSKY_GIT_PARAMS"}}'`
  );
}

// dependencies: git (2.28), npx (node 8.2.0)
async function initialize() {
  await cmd(`mkdir -p ${REMOTE_REPO_PATH}`);
  await remoteCmd(`git init -b ${MAIN_BRANCH}`);
  await remoteCmd("npm init --yes");
  await installYarnhook();
  await remoteCmd(`echo "console.log(1)" > index.js`);
  await remoteCmd("git add package.json package-lock.json index.js");
  await remoteCmd(`git commit -m "Initial commit"`);
  await remoteCmd(`git checkout -b ${NEW_BRANCH}`);
  await remoteCmd("npm install --save --package-lock-only number-zero");
  await remoteCmd(`echo "console.log(require('number-zero'))" > index.js`);
  await remoteCmd("git add package.json package-lock.json index.js");
  await remoteCmd(`git commit -m "Add number-zero"`);
}

async function cleanup() {
  await cmd(`rm -rf ${TEST_DIRECTORY}`);
}

beforeAll(initialize);

afterAll(cleanup);

beforeEach(async () => {
  await cmd(`git clone ${REMOTE_REPO_PATH} ${LOCAL_REPO_PATH} --branch=${MAIN_BRANCH}`);
  await localCmd("npm ci");
});

afterEach(async () => {
  await cmd(`rm -rf ${LOCAL_REPO_PATH}`);
});

describe("smoke test", () => {
  it("should ensure dependencies are up-to-date on branch change", async () => {
    await expect(localCmd("node index.js")).resolves.toBe("1");

    await localCmd(`git checkout ${NEW_BRANCH}`);
    await expect(localCmd("node index.js")).resolves.toBe("0");
  });

  it("should not fail when the first non-branch-changing checkout is done", async () => {
    await expect(localCmd("git checkout")).resolves.toBeDefined();
  });
});
