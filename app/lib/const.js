// bkr
export const BKR_SERVER_PORT = 17760

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i
export const DAT_URL_REGEX = /^(?:dat:\/\/)?([0-9a-f]{64})/i

// url file paths
export const DAT_VALID_PATH_REGEX = /^[a-z0-9\-._~!$&'()*+,;=:@\/]+$/i

// dat settings
export const DAT_MANIFEST_FILENAME = 'dat.json'
export const DAT_QUOTA_DEFAULT_BYTES_ALLOWED = (process.env.beaker_dat_quota_default_bytes_allowed || 104857600) // 100mb
export const DEFAULT_DAT_DNS_TTL = 3600 // 1hr
export const MAX_DAT_DNS_TTL = 3600 * 24 * 7 // 1 week
export const DEFAULT_DAT_API_TIMEOUT = 5e3 // 5s
