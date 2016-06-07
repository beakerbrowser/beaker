import fs from 'fs'
import path from 'path'
import * as dat from '../dat'

export function hostDebugDat () {
  var archive = dat.createArchive()

  // index.html
  var ws = archive.createFileWriteStream('index.html')
  ws.write(`
    <!doctype html>
    <html>
      <head><title>Test dat site</title></head>
      <body>
        <h1>Hello, dat world</h1>
        <img src="/images/icon.png">
      </body>
    </html>
  `)
  ws.end()

  // images/
  archive.createFileWriteStream({ type: 'directory', name: 'images' }).end()

  // images/icon.png
  var ws = archive.createFileWriteStream('images/icon.png')
  fs.createReadStream(path.join(__dirname,'../resources/icon.png')).pipe(ws)

  // done
  archive.finalize(function () {
    dat.cacheArchive(archive)
    var link = archive.key.toString('hex')
    console.log('dat://'+link+'/')

    console.log('Swarming...')
    var sw = dat.swarm(link)
    sw.on('peer', function (peer) {
      console.log('New swarm peer:', '0x'+peer.toString('hex'))
    })
  })
}