const { execFile } = require('node:child_process')
const path = require('node:path')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)
const allowedMinutes = new Set([1, 5, 60])
const powercfgPath = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'powercfg.exe',
)

async function runPowercfg(args) {
  const { stdout } = await execFileAsync(powercfgPath, args, {
    windowsHide: true,
    encoding: 'buffer',
    timeout: 10_000,
  })

  return stdout
}

function parseTimeouts(output) {
  const asciiOutput = Buffer.isBuffer(output)
    ? output.toString('latin1')
    : String(output)
  const values = [...asciiOutput.matchAll(/0x([0-9a-f]+)/gi)].map((match) =>
    Number.parseInt(match[1], 16),
  )

  if (values.length < 2) {
    throw new Error('无法读取当前屏幕关闭时间。')
  }

  const [acSeconds, dcSeconds] = values.slice(-2)
  return {
    acMinutes: acSeconds / 60,
    dcMinutes: dcSeconds / 60,
  }
}

async function getDisplayTimeouts() {
  const output = await runPowercfg([
    '/query',
    'SCHEME_CURRENT',
    'SUB_VIDEO',
    'VIDEOIDLE',
  ])
  const { acMinutes } = parseTimeouts(output)
  return { minutes: acMinutes }
}

async function setDisplayTimeouts(minutes) {
  if (!allowedMinutes.has(minutes)) {
    throw new TypeError('只允许设置 1、5 或 60 分钟。')
  }

  const value = String(minutes)
  await runPowercfg(['/change', 'monitor-timeout-ac', value])
  return getDisplayTimeouts()
}

module.exports = {
  allowedMinutes,
  getDisplayTimeouts,
  parseTimeouts,
  setDisplayTimeouts,
}
