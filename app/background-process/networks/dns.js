import log from 'loglevel'
import dns from 'dns'
import url from 'url'

import { DAT_HASH_REGEX } from '../../lib/const'

export function resolveDatDNS (name, cb) {
  // is it a hash?
  if (DAT_HASH_REGEX.test(name)) {
    return cb(null, name)
  }

  // do a dns lookup
  log.debug('[DAT] DNS TXT lookup for name:', name)
  dns.resolveTxt(name, (err, records) => {
    log.debug('[DAT] DNS TXT results for', name, err || records)
    if (err) return cb(err)

    // scan the txt records for a dat URI
    for (var i=0; i < records.length; i++) {
      if (records[i][0].indexOf('dat://') === 0) {
        var urlp = url.parse(records[i][0])
        if (DAT_HASH_REGEX.test(urlp.host)) {
          log.debug('[DAT] DNS resolved', name, 'to', urlp.host)
          return cb(null, urlp.host)
        }
        log.debug('[DAT] DNS TXT record failed:', records[i], 'Must be a dat://{hash} url')
      }
    }

    cb({ code: 'ENOTFOUND' })
  })
}
