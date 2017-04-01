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
const NOT_FOUND = 'MODULE_NOT_FOUND'

class RunCommand {
  constructor (projectRoot, bail = null, timeout = null, grep = null) {
    this._projectRoot = projectRoot
    this._japa = this._requireJapa()
    this._japaCli = this._japa.cli
    this._bail = bail
    this._timeout = timeout
    this._grep = grep
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
    return globby([testsGlob].concat(filesToIgnore))
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
    return new Promise((resolve, reject) => {
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
     * Call methods over japa when defined
     */
    if (this._timeout !== null && !isNaN(this._timeout)) { this._japa.timeout(this._timeout) }
    if (this._bail !== null) { this._japa.bail(this._bail) }
    if (this._grep) { this._japa.grep(this._grep) }

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
