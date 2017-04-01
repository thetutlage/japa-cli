'use strict'

const test = require('japa')
const pify = require('pify')
const fs = require('fs')
const path = require('path')
const clearRequire = require('clear-require')

const RunCommand = require('../src/RunCommand')
const japaCli = require('japa/cli')

test.group('Run Command', (group) => {
  group.afterEach(() => {
    japaCli._initiate()
    return new Promise((resolve) => {
      const japaFile = path.join(__dirname, '../japaFile.js')
      pify(fs.unlink)(japaFile).then(resolve).catch(resolve)
      clearRequire(japaFile)
    })
  })

  test('set timeout to 0 when defined', (assert) => {
    const runCommand = new RunCommand(path.join(__dirname, '../'), {
      timeout: 0
    })
    assert.equal(runCommand._timeout, 0)
  })

  test('set grep to empty string when defined', (assert) => {
    const runCommand = new RunCommand(path.join(__dirname, '../'), {
      grep: ''
    })
    assert.equal(runCommand._grep, '')
  })

  test('ignore exception when japaFile does not exists', (assert) => {
    const runCommand = new RunCommand(path.join(__dirname, '../'), {})
    runCommand._requireJapaFileIfExists()
  })

  test('require japa file if it exists', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})
      const japaFile = path.join(__dirname, '../japaFile.js')

      pify(fs.writeFile)(japaFile, `
        const cli = require('japa/cli')
        cli.run('custom path')
      `).then(() => {
        runCommand._requireJapaFileIfExists()
        assert.equal(japaCli.testsGlob, 'custom path')
        resolve()
      }).catch((error) => {
        reject(error)
      })
    })
  })

  test('throw exception if japa file has exception', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})
      const japaFile = path.join(__dirname, '../japaFile.js')

      pify(fs.writeFile)(japaFile, `
        const cli = require('japa/cli')
        cli.foo()
      `).then(() => {
        return runCommand._requireJapaFileIfExists()
      }).catch((error) => {
        assert.equal(error.message, 'cli.foo is not a function')
        resolve()
      }).catch(reject)
    })
  })

  test('return all test files from based on glob', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})
      japaCli.run('test/*.spec.js')
      runCommand
        ._getTestFiles()
        .then((files) => {
          const expectedFiles = ['run-command.spec.js'].map((f) => path.join(__dirname, f))
          assert.deepEqual(files, expectedFiles)
          resolve()
        }).catch(reject)
    })
  })

  test('ignore files based on glob', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})
      japaCli.filter('test/run-command.spec.js').run('test/*.spec.js')
      runCommand
        ._getTestFiles()
        .then((files) => {
          assert.deepEqual(files, [])
          resolve()
        }).catch(reject)
    })
  })

  test('pass each file to the filter callback', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})
      const receivedFiles = []

      japaCli.filter(function (file) {
        receivedFiles.push(file)
        return false
      }).run('test/*.spec.js')

      runCommand
        ._getTestFiles()
        .then(runCommand._filterFiles.bind(runCommand))
        .then(() => {
          const expectedFiles = ['run-command.spec.js'].map((f) => path.join(__dirname, f))
          assert.deepEqual(receivedFiles, expectedFiles)
          resolve()
        })
        .catch(reject)
    })
  })

  test('ignore files for each filter returns false', (assert) => {
    assert.plan(1)
    return new Promise((resolve, reject) => {
      const runCommand = new RunCommand(path.join(__dirname, '../'), {})

      japaCli.filter(function (file) {
        return !file.includes('run-command.spec.js')
      }).run('test/*.spec.js')

      runCommand
        ._getTestFiles()
        .then(runCommand._filterFiles.bind(runCommand))
        .then((files) => {
          assert.deepEqual(files, [])
          resolve()
        })
        .catch(reject)
    })
  })
})
