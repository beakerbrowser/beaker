import bytes from 'bytes'
import ms from 'ms'

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i
export const DAT_URL_REGEX = /^(?:dat:\/\/)?([0-9a-f]{64})/i

// url file paths
export const DAT_VALID_PATH_REGEX = /^[a-z0-9\-._~!$&'()*+,;=:@/]+$/i

// dat settings
export const DAT_SWARM_PORT = 3282
export const DAT_MANIFEST_FILENAME = 'dat.json'
export const DAT_QUOTA_DEFAULT_BYTES_ALLOWED = bytes.parse(process.env.beaker_dat_quota_default_bytes_allowed || '500mb')
export const DEFAULT_DAT_DNS_TTL = ms('1h')
export const MAX_DAT_DNS_TTL = ms('7d')
export const DEFAULT_DAT_API_TIMEOUT = ms('5s')
export const DAT_GC_EXPIRATION_AGE = ms('5d') // how old do archives need to be before deleting them from the cache?
export const DAT_GC_FIRST_COLLECT_WAIT = ms('5m') // how long after process start to do first collect?
export const DAT_GC_REGULAR_COLLECT_WAIT = ms('2h') // how long between GCs to collect?
export const DAT_GC_DEFAULT_MINIMUM_SIZE = bytes('2mb') // how big do dats need to be, to be subject to GC?

// dat staging paths
export const INVALID_SAVE_FOLDER_CHAR_REGEX = /[^0-9a-zA-Z-_ ]/g
export const DISALLOWED_SAVE_PATH_NAMES = [
  'home',
  'desktop',
  'documents',
  'downloads',
  'music',
  'pictures',
  'videos'
]
