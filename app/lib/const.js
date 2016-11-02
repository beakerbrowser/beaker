import zerr from 'zerr'

// 64 char hex
export const DAT_HASH_REGEX = /^[0-9a-f]{64}$/i

// special files
export const DAT_MANIFEST_FILENAME = 'dat.json'

// errors
export const ProtocolSetupError = zerr('ProtocolSetupError')
export const UserDeniedError = zerr('UserDeniedError')
export const PermissionsError = zerr('PermissionsError')
export const ArchiveNotSavedError = zerr('ArchiveNotSavedError')
export const InvalidURLError = zerr('InvalidURLError')
export const InvalidArchiveKeyError = zerr('InvalidArchiveKeyError')
export const InvalidOperationError = zerr('InvalidOperationError')
export const InvalidEncodingError = zerr('InvalidEncodingError')
export const FileNotFoundError = zerr('FileNotFoundError')
export const FileReadError = zerr('FileReadError')
export const FileWriteError = zerr('FileWriteError')
export const ProtectedFileNotWritableError = zerr('ProtectedFileNotWritableError')
export const FileAlreadyExistsError = zerr('FileAlreadyExistsError')
export const FolderAlreadyExistsError = zerr('FolderAlreadyExistsError')
export const ParentFolderDoesntExistError = zerr('ParentFolderDoesntExistError')
