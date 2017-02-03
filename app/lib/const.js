import zerr from 'zerr'

// bkr
export const BKR_SERVER_PORT = 17760

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i

// url file paths
export const DAT_VALID_PATH_REGEX = /^[a-z0-9\-._~!$&'()*+,;=:@\/]+$/i

// dat settings
export const DAT_MANIFEST_FILENAME = 'dat.json'
export const DAT_QUOTA_DEFAULT_BYTES_ALLOWED = (process.env.beaker_dat_quota_default_bytes_allowed || 104857600) // 100mb
export const DEFAULT_DAT_DNS_TTL = 3600 // 1hr
export const MAX_DAT_DNS_TTL = 3600 * 24 * 7 // 1 week

// protocol errors
export const ProtocolSetupError = zerr('ProtocolSetupError')

// permission errors
export const UserDeniedError = zerr('UserDeniedError')
export const PermissionsError = zerr('PermissionsError')
export const QuotaExceededError = zerr('QuotaExceededError')
export const ArchiveNotWritableError = zerr('ArchiveNotWritableError')

// validation/bad-behavior errors
export const ArchiveNotSavedError = zerr('ArchiveNotSavedError')
export const InvalidURLError = zerr('InvalidURLError')
export const InvalidArchiveKeyError = zerr('InvalidArchiveKeyError')
export const InvalidOperationError = zerr('InvalidOperationError')
export const InvalidEncodingError = zerr('InvalidEncodingError')

// dat errors
export const TimeoutError = zerr('TimeoutError')
export const FileNotFoundError = zerr('FileNotFoundError')
export const FileReadError = zerr('FileReadError')
export const FileWriteError = zerr('FileWriteError')
export const ProtectedFileNotWritableError = zerr('ProtectedFileNotWritableError')
export const FileAlreadyExistsError = zerr('FileAlreadyExistsError')
export const FolderAlreadyExistsError = zerr('FolderAlreadyExistsError')
export const ParentFolderDoesntExistError = zerr('ParentFolderDoesntExistError')
export const InvalidPathError = zerr('InvalidPathError')
