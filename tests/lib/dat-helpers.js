const Dat = require('dat-node')
const ram = require('random-access-memory')

exports.shareDat = function (dir) {
  return new Promise((resolve, reject) => {
    Dat(ram, function (err, dat) {
      if (err) return reject(err)
      dat.importFiles(dir, function (err) {
        if (err) return reject(err)
        resolve(dat)
      })
    })
  })
}
