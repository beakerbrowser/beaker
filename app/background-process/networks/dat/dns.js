import {InvalidDomainName} from 'beaker-error-constants'
import * as sitedataDb from '../../dbs/sitedata'
import {DAT_HASH_REGEX} from '../../../lib/const'

// instantate a dns cache and export it
const datDns = require('dat-dns')({
  persistentCache: {read, write}
})
export default datDns

// wrap resolveName() with a better error
const resolveName = datDns.resolveName
datDns.resolveName = function () {
  return resolveName.apply(datDns, arguments)
    .catch(err => {
      throw new InvalidDomainName()
    })
}

// persistent cache methods
const sitedataDbOpts = {dontExtractOrigin: true}
async function read (name, err) {
  var key = await sitedataDb.get('dat:' + name, 'dat-key', sitedataDbOpts)
  if (!key) throw err
  return key
}
async function write (name, key) {
  if (DAT_HASH_REGEX.test(name)) return // dont write for raw urls
  await sitedataDb.set('dat:' + name, 'dat-key', key, sitedataDbOpts)
}
