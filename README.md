# yarnhook [![npm version](https://badge.fury.io/js/yarnhook.svg)](https://badge.fury.io/js/yarnhook)

`yarnhook` keeps your `node_modules` up-to-date when your `yarn.lock` changes
due to git operations like `checkout`, `merge`, `rebase`, `pull` etc.

# Installation

This package should be used with [husky](https://www.npmjs.com/package/husky).

```sh
yarn add --dev yarnhook husky
```

# Usage

You should let `yarnhook` handle git hooks that change the dependencies. Example
`package.json` is as follows:

```json
{
  "scripts": {
    "postmerge": "yarnhook",
    "postcheckout": "yarnhook",
    "postrewrite": "yarnhook"
  }
}
```

# Flags

Prepend `YARNHOOK_BYPASS=true` to your git command if you don't want to run
`yarn install` as a result, `YARNHOOK_DEBUG=true` to print debug information.

An example:

```sh
YARNHOOK_BYPASS=true git checkout feature-branch
```
