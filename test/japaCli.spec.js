'use strict'

const test = require('japa')
const japaCli = require('../index')

test.group('Japa Cli', (group) => {
  group.beforeEach(() => {
    japaCli._initiate()
  })

  test('allow a string to be ignored', (assert) => {
    japaCli.filter('foo.js')
    assert.deepEqual(japaCli.ignorePattern, ['foo.js'])
  })

  test('allow an array of globs to be ignored', (assert) => {
    japaCli.filter(['foo.js', 'bar.js'])
    assert.deepEqual(japaCli.ignorePattern, ['foo.js', 'bar.js'])
  })

  test('allow a callback to be passed to filter fn', (assert) => {
    japaCli.filter(function () {})
    assert.isFunction(japaCli.filterCallback)
    assert.lengthOf(japaCli.ignorePattern, 0)
  })

  test('throw exception when filter param is not an array,string of fn', (assert) => {
    const fn = () => japaCli.filter({})
    assert.throw(fn, 'japaCli.filter only excepts a glob string, array or a callback function')
  })

  test('set bail to true', (assert) => {
    assert.isFalse(japaCli._bail)
    japaCli.bail(true)
    assert.isTrue(japaCli._bail)
  })

  test('set timeout', (assert) => {
    assert.isNull(japaCli._timeout)
    japaCli.timeout(100)
    assert.equal(japaCli._timeout, 100)
  })

  test('set grep string', (assert) => {
    assert.isNull(japaCli._grep)
    japaCli.grep('foo')
    assert.equal(japaCli._grep, 'foo')
  })

  test('set glob pattern for test files', (assert) => {
    assert.equal(japaCli.testsGlob, 'test/*.spec.js')
    japaCli.run('test/**/*.js')
    assert.equal(japaCli.testsGlob, 'test/**/*.js')
  })

  test('throw exception when pattern is not a string', (assert) => {
    const fn = () => japaCli.run(['test/**/*.js'])
    assert.throw(fn, 'japaCli.run excepts glob pattern to be a string. You passed object')
  })
})
