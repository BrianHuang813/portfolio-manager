import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const localPython = path.join(root, 'leadership', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const executable = existsSync(localPython) ? localPython : 'python'
const requested = process.argv.slice(2)
const args = requested[0] === '--test'
  ? ['-m', 'pytest', 'leadership/tests', '-q', ...requested.slice(1)]
  : ['leadership/pipeline.py', ...requested]
const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', env: { ...process.env, PYTHONUNBUFFERED: '1' } })
if (result.error) {
  console.error('Python 環境尚未建立，請依 leadership/README.md 安裝。', result.error.message)
}
process.exit(result.status ?? 1)
