# lockfilehook [![npm version](https://badge.fury.io/js/lockfilehook.svg)](https://badge.fury.io/js/lockfilehook)

`lockfilehook` keeps your `node_modules` up-to-date when your `yarn.lock` or `package-lock.json` changes
due to git operations like `checkout`, `merge`, `rebase`, `pull` etc.

# Installation

This package should be used with [husky](https://www.npmjs.com/package/husky).

```sh
yarn add --dev lockfilehook husky
# or 
npm install --save-dev lockfilehook husky
```

# Usage

You should let `lockfilehook` handle git hooks that change the dependencies. Example
`package.json` is as follows:

```json
{
  "scripts": {
    "postmerge": "lockfilehook",
    "postcheckout": "lockfilehook",
    "postrewrite": "lockfilehook"
  }
}
```

# Flags

Prepend `LOCKFILEHOOK_BYPASS=true` to your git command if you don't want to run
`[yarn|npm] install` as a result, `LOCKFILEHOOK_DEBUG=true` to print debug information.

An example:

```sh
LOCKFILEHOOK_BYPASS=true git checkout feature-branch
```
