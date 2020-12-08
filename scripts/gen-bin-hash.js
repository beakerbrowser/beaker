const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

console.log('Generating hash for', process.argv[2])

function hashFile(file, algorithm = 'sha512', encoding = 'base64', options) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    hash.on('error', reject).setEncoding(encoding);
    fs.createReadStream(
      file,
      Object.assign({}, options, {
        highWaterMark: 1024 * 1024,
        /* better to use more memory but hash faster */
      })
    )
      .on('error', reject)
      .on('end', () => {
        hash.end();
        console.log('hash done');
        console.log(hash.read());
        resolve(hash.read());
      })
      .pipe(
        hash,
        {
          end: false,
        }
      );
  });
}

const installerPath = path.resolve(
  __dirname,
  '..',
  'dist',
  process.argv[2]
);

hashFile(installerPath);