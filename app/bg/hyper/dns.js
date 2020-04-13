import { InvalidDomainName } from 'beaker-error-constants'
import datDnsFactory from 'dat-dns'
import * as datDnsDb from '../dbs/dat-dns'
import * as drives from './drives'
import { HYPERDRIVE_HASH_REGEX } from '../../lib/const'
import * as capabilities from './capabilities'
import * as logLib from '../logger'
const logger = logLib.child({category: 'hyper', subcategory: 'dns'})

var localMapByName = {}
var localMapByKey = {}

export function setLocal (name, url) {
  var key = toHostname(url)
  localMapByName[name] = key
  localMapByKey[key] = name
}

export async function resolveName (name) {
  name = toHostname(name)
  if (HYPERDRIVE_HASH_REGEX.test(name)) return name
  return localMapByName[name]
}

export async function reverseResolve (key) {
  return localMapByKey[toHostname(key)]
}

function toHostname (v) {
  if (Buffer.isBuffer(v)) {
    return v.toString('hex')
  }
  try {
    var urlp = new URL(v)
    return urlp.hostname
  } catch (e) {
    return v
  }
}

/*
TODO

const DNS_PROVIDERS = [['cloudflare-dns.com', '/dns-query'], ['dns.google.com', '/resolve']]
const DNS_PROVIDER = DNS_PROVIDERS[Math.random() > 0.5 ? 1 : 0]
logger.info(`Using ${DNS_PROVIDER[0]} to resolve DNS lookups`)

// instantate a dns cache and export it
const datDns = datDnsFactory({
  persistentCache: {read, write},
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

// persistent cache methods
async function read (name, err) {
  // check the cache
  var record = await datDnsDb.getCurrentByName(name)
  if (!record) throw err
  return record.key
}
async function write (name, key) {
  if (HYPERDRIVE_HASH_REGEX.test(name)) return // dont write for raw urls
  await drives.confirmDomain(key)
}
*/