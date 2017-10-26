const childProcess = require('child_process')
module.exports = async function (cmd, opts = {}) {
  console.log(cmd)
  cmd = cmd.split(' ')
  opts.stdio = 'inherit'
  opts.env = process.env
  return new Promise(resolve => {
    childProcess.spawn(cmd[0], cmd.slice(1), opts)
      .on('error', console.log)
      .on('close', resolve)
  })
}
