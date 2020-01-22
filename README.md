# yarnhook [![npm version](https://badge.fury.io/js/yarnhook.svg)](https://badge.fury.io/js/yarnhook)

![yarnhook](/logo.svg)

`yarnhook` keeps your `node_modules` up-to-date when your `yarn.lock`, `package-lock.json` or
`shrinkwrap.yaml` changes due to git operations like `checkout`, `merge`, `rebase`, `pull` etc.

# Installation

This package should be used with [husky](https://www.npmjs.com/package/husky).

```sh
yarn add --dev yarnhook husky
# or
npm install --save-dev yarnhook husky
# or
pnpm install --save-dev yarnhook husky
```

# Usage

You should let `yarnhook` handle git hooks that change the dependencies. Example `package.json` is
as follows:

```json
{
  "husky": {
    "hooks": {
      "post-checkout": "yarnhook",
      "post-merge": "yarnhook",
      "post-rewrite": "yarnhook"
    }
  },
}
```

`yarnhook` first checks for a `yarn.lock` file. If there is one, it will only check if that file has changed, and may then run `yarn` if the `yarn.lock` has changed. If yarn.lock file is not present, it will search for files in this order, and use the corresponding "\*pm" command https://github.com/frontsideair/yarnhook/blob/29296a37a60c2771c9a45f3717c3659dbd69dbe9/index.js#L15

Note that `git pull` doesn't always trigger the post-merge git hook. If it's a fast-forward update, git doesn't trigger any hooks (unless you are a for some reason actually running on a real git server, in which case, there is the `post-receive` hook)


# Flags

Prepend these flags to your git command to use them.

* `YARNHOOK_BYPASS`: Run git command bypassing yarnhook completely
* `YARNHOOK_DEBUG`: Print debug information
* `YARNHOOK_DRYRUN`: Don't install dependencies, only notify

An example:

```sh
YARNHOOK_BYPASS=true git checkout feature-branch
```

# Artwork

Project logo: @anilkilic

Font: PT Sans
