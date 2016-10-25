const Dat = require('dat-js')
const memdb = require('memdb')

exports.shareDat = function (dir) {
  return new Promise((resolve, reject) => {
    var dat = Dat({ dir, db: memdb() })
    dat.share(() => resolve(dat))
  })
}
