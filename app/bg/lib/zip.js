import { join } from 'path'
import yazl from 'yazl'

/**
 * @typedef {import('../dat/daemon').DaemonHyperdrive} DaemonHyperdrive
 * @typedef {import('stream').Readable} Readable
 */

/**
 * @param {DaemonHyperdrive} drive
 * @param {string} [dirpath = '/']
 * @returns {Readable}
 */
export const toZipStream = function (drive, dirpath = '/') {
  var zipfile = new yazl.ZipFile()

  // create listing stream
  drive.pda.readdir(dirpath, {recursive: true}).then(async (paths) => {
    for (let path of paths) {
      let readPath = join(dirpath, path)

      // files only
      try {
        let entry = await drive.pda.stat(readPath)
        if (!entry.isFile()) {
          continue
        }
      } catch (e) {
        // ignore, file must have been removed
        continue
      }

      // pipe each entry into the zip
      zipfile.addBuffer(await drive.pda.readFile(readPath, 'binary'), path)
      // NOTE
      // for some reason using drive.createReadStream() to feed into the zipfile addReadStream() was not working with multiple files
      // no idea why, maybe a sign of a bug in the dat-daemon's zip rpc
      // -prf
    }
    zipfile.end()
  }).catch(onerror)

  // on error, push to the output stream
  function onerror (e) {
    console.error('Error while producing zip stream', e)
    zipfile.outputStream.emit('error', e)
  }

  return zipfile.outputStream
}