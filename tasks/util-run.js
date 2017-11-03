const childProcess = require('child_process')
module.exports = function (cmd, opts = {}, cb) {
  console.log(cmd)
  cb = cb || function(){}
  cmd = cmd.split(' ')
  opts.stdio = 'inherit'
  opts.env = process.env
  childProcess.spawn(cmd[0], cmd.slice(1), opts)
    .on('error', console.log)
    .on('close', cb)
}
