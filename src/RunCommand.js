'use strict'

/*
 * japa-cli
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const globby = require('globby')
const colors = require('colors')
const leftPad = require('left-pad')
const NOT_FOUND = 'MODULE_NOT_FOUND'

class RunCommand {
  constructor (projectRoot, flags) {
    this._projectRoot = projectRoot
    this._bail = flags.bail
    this._timeout = Number(flags.timeout)
    this._grep = flags.grep
    this._verbose = flags.verbose

    this._japaCli = this._requireJapaCli()

    /**
     * For logging
     */
    this._lines = [{
      key: 'project root',
      getValue: () => colors.gray(this._projectRoot)
    }]
  }

  /**
   * Prints the log lines when verbose is set
   * to true.
   *
   * @method _printLogLines
   *
   * @return {void}
   *
   * @private
   */
  _printLogLines () {
    if (!this._verbose) {
      return
    }

    const minWidth = 14
    console.log()
    this._lines.forEach((line) => {
      console.log(`${colors.gray(leftPad(line.key, minWidth))} ${colors.gray('::')} ${line.getValue(minWidth)}`)
    })
    console.log()
  }

  /**
   * Requires `japaFile.js` if it exists, otherwise ignore
   * it.
   *
   * @method _requireJapaFileIfExists
   *
   * @return {void}
   *
   * @throws {Error} If error.code is not ENOENT
   *
   * @private
   */
  _requireJapaFileIfExists () {
    try {
      require(path.join(this._projectRoot, 'japaFile.js'))
    } catch (error) {
      if (error.code !== NOT_FOUND) { throw error }
    }
  }

  /**
   * Check if japa is installed if not we need to throw a
   * proper exception stating japa is required to run
   * any tests.
   *
   * @method _requireJapa
   *
   * @return {Object}
   *
   * @private
   */
  _requireJapa () {
    try {
      return require(path.join(this._projectRoot, 'node_modules/japa'))
    } catch (error) {
      if (error.code === NOT_FOUND) {
        throw new Error('Make sure to install japa before running tests. npm i --save-dev japa')
      }
      throw error
    }
  }

  /**
   * Requires the japa cli file.
   *
   * @method _requireJapaCli
   *
   * @return {Object}
   *
   * @private
   */
  _requireJapaCli () {
    try {
      return require(path.join(this._projectRoot, 'node_modules/japa/cli'))
    } catch (error) {
      if (error.code === NOT_FOUND) {
        throw new Error('Make sure to install japa before running tests. npm i --save-dev japa')
      }
      throw error
    }
  }

  /**
   * Require all test files by setting up the proper ignore
   * pattern and passing it to globby
   *
   * @method _getTestFiles
   *
   * @return {Promise}
   *
   * @private
   */
  _getTestFiles () {
    const testsGlob = path.join(this._projectRoot, this._japaCli.testsGlob)
    const filesToIgnore = this._japaCli.ignorePattern.map((glob) => `!${path.join(this._projectRoot, glob)}`)

    /**
     * Push lines for verbose reporting. It has nothing
     * to do with the tests flow.
     */
    this._lines.push({
      key: 'test files',
      getValue: (minWidth) => {
        const innerLines = [`  ${colors.white(testsGlob)}`]
          .concat(colors.gray('exclude'))
          .concat(filesToIgnore.map((line) => `  ${colors.white(line)}`))
          .map((line) => `${leftPad('', minWidth)}    ${line}`)
          .join('\n')
        return `${colors.gray('include')}\n${innerLines}`
      }
    })

    return globby([testsGlob].concat(filesToIgnore), {
      realpath: true
    })
  }

  /**
   * Filter files when a filter callback has been defined.
   * The callback is supposed to return true for the
   * files to be ignored
   *
   * @method _filterFiles
   *
   * @param  {Array}     files
   *
   * @return {Array}
   *
   * @private
   */
  _filterFiles (files) {
    if (typeof (this._japaCli.filterCallback) !== 'function') {
      return files
    }
    return files.filter((file) => this._japaCli.filterCallback(file))
  }

  /**
   * Finally run the filtered test files
   *
   * @method _runTests
   *
   * @param  {Array}  files
   *
   * @return {Promise}
   *
   * @private
   */
  _runTests (files) {
    this._printLogLines()
    return new Promise((resolve, reject) => {
      /**
       * Update japa settings before running the
       * tests
       */
      const japa = this._requireJapa()
      if (this._timeout !== null && !isNaN(this._timeout)) { japa.timeout(this._timeout) }
      if (this._bail !== null) { japa.bail(this._bail) }
      if (this._grep) { japa.grep(this._grep) }

      /**
       * Wait for process to exist, since japa will
       * return the tests by itself.
       */
      process.on('exit', (code) => {
        if (code === 1) {
          return reject(new Error('japa-cli: Tests failed'))
        }
        resolve()
      })

      /**
       * Requiring the files will run
       * the tests
       */
      files.forEach((file) => require(file))
    })
  }

  /**
   * Public interface to run all the files.
   *
   * @method run
   *
   * @return {void}
   */
  run () {
    this._requireJapaFileIfExists()

    /**
     * Time to get the test files
     * Filter them
     * And run tests.
     */
    this._getTestFiles()
    .then(this._filterFiles.bind(this))
    .then(this._runTests.bind(this))
    .catch((error) => {
      console.log(error)
      process.exit(1)
    })
  }
}

module.exports = RunCommand
