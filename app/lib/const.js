import bytes from 'bytes'
import ms from 'ms'

// file paths
export const ANALYTICS_DATA_FILE = 'analytics-ping.json'
export const ANALYTICS_SERVER = 'analytics.beakerbrowser.com'
export const ANALYTICS_CHECKIN_INTERVAL = ms('1w')

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i
export const DAT_URL_REGEX = /^(?:dat:\/\/)?([0-9a-f]{64})/i

// url file paths
export const DAT_VALID_PATH_REGEX = /^[a-z0-9\-._~!$&'()*+,;=:@/\s]+$/i
export const INVALID_SAVE_FOLDER_CHAR_REGEX = /[^0-9a-zA-Z-_ ]/g

// dat settings
export const DAT_SWARM_PORT = 3282
export const DAT_MANIFEST_FILENAME = 'dat.json'
export const DAT_QUOTA_DEFAULT_BYTES_ALLOWED = bytes.parse(process.env.beaker_dat_quota_default_bytes_allowed || '500mb')
export const DEFAULT_DAT_DNS_TTL = ms('1h')
export const MAX_DAT_DNS_TTL = ms('7d')
export const DEFAULT_DAT_API_TIMEOUT = ms('5s')
export const DAT_GC_EXPIRATION_AGE = ms('7d') // how old do archives need to be before deleting them from the cache?
export const DAT_GC_FIRST_COLLECT_WAIT = ms('30s') // how long after process start to do first collect?
export const DAT_GC_REGULAR_COLLECT_WAIT = ms('15m') // how long between GCs to collect?
// dat.json manifest fields which can be changed by configure()
export const DAT_CONFIGURABLE_FIELDS = [
  'title',
  'description',
  'links',
  'web_root',
  'fallback_page'
]
// dat.json manifest fields which should be preserved in forks
export const DAT_PRESERVED_FIELDS_ON_FORK = [
  'web_root',
  'fallback_page',
  'links'
]

// workspace settings
export const WORKSPACE_VALID_NAME_REGEX = /^[a-z][a-z0-9-]*$/i

// git-url validator
export const IS_GIT_URL_REGEX = /(?:git|ssh|https?|git@[-\w.]+):(\/\/)?(.*?)(\.git)(\/?|\#[-\d\w._]+?)$/

// archive metadata
// TODO- these may not all be meaningful anymore -prf
export const STANDARD_ARCHIVE_TYPES = [
  'application',
  'module',
  'dataset',
  'documents',
  'music',
  'photos',
  'user-profile',
  'videos',
  'website'
]

// URLs used in various places in the UI
export const URL_HASHBASE = process.env.beaker_hashbase_hostname || 'hashbase.io'
export const URL_DEDICATED_PEER_GUIDE = 'https://TODO' // TODO
export const URL_SELF_HOSTING_GUIDE = 'https://TODO' // TODO
export const URL_DOCS_LAB_API_LIBRARY = 'https://TODO' // TODO

// rel-types
export const REL_ACCOUNT_API = 'https://archive.org/services/purl/purl/datprotocol/spec/pinning-service-account-api'
export const REL_DATS_API = 'https://archive.org/services/purl/purl/datprotocol/spec/pinning-service-dats-api'
