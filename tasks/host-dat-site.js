var gulp = require('gulp')
var hyperdrive = require('hyperdrive')
var swarm = require('hyperdrive-archive-swarm')
var memdb = require('memdb')
var fs = require('fs')
var path = require('path')

var drive = hyperdrive(memdb())

gulp.task('host-dat-site', function () {
  var archive = drive.createArchive()

  // index.html
  var ws = archive.createFileWriteStream('index.html')
  ws.write(`
    <!doctype html>
    <html>
      <head><title>Test dat site</title></head>
      <body>
        <h1>Hello, dat world</h1>
        <img src="/icon.png">
      </body>
    </html>
  `)
  ws.end()

  // icon.png
  var ws = archive.createFileWriteStream('icon.png')
  fs.createReadStream(path.join(__dirname,'../resources/icon.png')).pipe(ws)

  // done
  archive.finalize(function () {
    var link = archive.key.toString('hex')
    console.log('dat://'+link+'/')

    console.log('Swarming...')
    var sw = swarm(archive)
    sw.on('peer', function (peer) {
      console.log('New swarm peer:', '0x'+peer.toString('hex'))
    })
  })
})
