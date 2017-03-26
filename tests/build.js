const browserify = require('../node_modules/browserify')
const fs = require('fs')
const path = require('path')

var b = browserify();
b.add('./scaffold/test-profiles-dat/index.js');
b.bundle().pipe(fs.createWriteStream(path.join(__dirname, 'scaffold/test-profiles-dat/index.build.js')))