const test = require('node:test')
const assert = require('node:assert/strict')
const { parseTimeouts } = require('../electron/power-settings.cjs')

test('parses the final AC and DC timeout values from localized powercfg output', () => {
  const output = `
    minimum 0x00000000
    maximum 0xffffffff
    increment 0x00000001
    AC 0x00000e10
    DC 0x0000012c
  `

  assert.deepEqual(parseTimeouts(output), {
    acMinutes: 60,
    dcMinutes: 5,
  })
})

test('rejects output without timeout indexes', () => {
  assert.throws(() => parseTimeouts('no values here'), /无法读取/)
})
