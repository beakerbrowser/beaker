import zerr from 'zerr'

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i

// special files
export const DAT_MANIFEST_FILENAME = 'dat.json'

// errors
export const ProtocolSetupError = zerr('ProtocolSetupError')
export const PermissionsError = zerr('PermissionsError')
export const InvalidURLError = zerr('InvalidURLError')
export const FileNotFoundError = zerr('FileNotFoundError')
export const FileReadError = zerr('FileReadError')
