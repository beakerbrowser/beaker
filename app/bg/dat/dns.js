import { InvalidDomainName } from 'beaker-error-constants'
import * as logLib from '../logger'
const logger = logLib.child({category: 'dat', subcategory: 'dns'})

const DNS_PROVIDERS = [['cloudflare-dns.com', '/dns-query'], ['dns.google.com', '/resolve']]
const DNS_PROVIDER = DNS_PROVIDERS[Math.random() > 0.5 ? 1 : 0]

// instantate a dns cache and export it
import datDnsFactory from 'dat-dns'

const datDns = datDnsFactory({
  dnsHost: DNS_PROVIDER[0],
  dnsPath: DNS_PROVIDER[1]
})

export default datDns

// hook up log events
datDns.on('resolved', details => logger.debug('Resolved', {details}))
datDns.on('failed', details => logger.debug('Failed lookup', {details}))
datDns.on('cache-flushed', details => logger.debug('Cache flushed'))

// wrap resolveName() with a better error
const resolveName = datDns.resolveName
datDns.resolveName = async function (name, opts, cb) {
  return resolveName.apply(datDns, arguments)
    .catch(_ => {
      throw new InvalidDomainName()
    })
}
