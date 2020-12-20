stackmate
=========

Command Line Interface to Stackmate.io

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/stackmate.svg)](https://npmjs.org/package/stackmate)
[![Downloads/week](https://img.shields.io/npm/dw/stackmate.svg)](https://npmjs.org/package/stackmate)
[![License](https://img.shields.io/npm/l/stackmate.svg)](https://github.com/falexandrou/stackmate-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g stackmate
$ stackmate COMMAND
running command...
$ stackmate (-v|--version|version)
stackmate/0.1.0 darwin-x64 node-v12.16.2
$ stackmate --help [COMMAND]
USAGE
  $ stackmate COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`stackmate help [COMMAND]`](#stackmate-help-command)
* [`stackmate init`](#stackmate-init)
* [`stackmate login`](#stackmate-login)
* [`stackmate role`](#stackmate-role)

## `stackmate help [COMMAND]`

display help for stackmate

```
USAGE
  $ stackmate help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.1/src/commands/help.ts)_

## `stackmate init`

initialize a project in stackmate.io

```
USAGE
  $ stackmate init
```

_See code: [src/commands/init.js](https://github.com/falexandrou/stackmate-cli/blob/v0.1.0/src/commands/init.js)_

## `stackmate login`

log in to stackmate.io

```
USAGE
  $ stackmate login

OPTIONS
  -n, --name=name  name to print
```

_See code: [src/commands/login.js](https://github.com/falexandrou/stackmate-cli/blob/v0.1.0/src/commands/login.js)_

## `stackmate role`

adds an AWS role to stackmate.io

```
USAGE
  $ stackmate role

OPTIONS
  -p, --profile=profile  The AWS profile to use
```

_See code: [src/commands/role.js](https://github.com/falexandrou/stackmate-cli/blob/v0.1.0/src/commands/role.js)_
<!-- commandsstop -->
