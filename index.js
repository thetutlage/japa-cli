#!/usr/bin/env node
'use strict'

/*
 * japa-cli
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const program = require('commander')
const RunCommand = require('./src/RunCommand')

program
  .version(require('./package.json').version)
  .option('-b, --bail [value]', 'Exit early when a test fails')
  .option('-t, --timeout [value]', 'Define global timeout for all the tests')
  .option('-g, --grep [value]', 'Run only specific tests by grepping over test title')
  .parse(process.argv)

new RunCommand(process.cwd(), program.bail === 'true', Number(program.timeout), program.grep).run()
