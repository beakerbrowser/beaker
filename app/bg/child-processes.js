import * as childProcess from 'child_process'

// globals
// =

var processes = {}
process.on('exit', closeAll)

// exported api
// =

export async function spawn (id, modulePath, ...args) {
  var fullModulePath = require.resolve(modulePath)
  const opts = {
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: 1
    })
  }
  console.log(`Starting external process ${id}`)
  var proc = childProcess.fork(fullModulePath, args, opts)
    .on('error', console.log)
    .on('close', () => {
      delete processes[id]
    })

  proc.send({start: true})

  await new Promise((resolve, reject) => {
    proc.once('message', resolve)
  })

  processes[id] = proc
  return proc
}

export function close (id) {
  processes[id].kill()
  delete processes[id]
}

export function closeAll () {
  for (let id in processes) {
    close(id)
  }
}