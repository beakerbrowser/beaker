'use strict';

var pathUtil = require('path');
var jetpack = require('fs-jetpack');
var rollup = require('rollup');
var Q = require('q');
var browserify = require('browserify');
var intoStream = require('into-stream');

var nodeBuiltInModules = ['assert', 'buffer', 'child_process', 'cluster',
  'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
  'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers',
  'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'];

var electronBuiltInModules = ['electron'];

var npmModulesUsedInApp = function () {
  var appManifest = require('../../../app/package.json');
  return Object.keys(appManifest.dependencies);
};

var generateExternalModulesList = function () {
  return [].concat(nodeBuiltInModules, electronBuiltInModules, npmModulesUsedInApp());
};

module.exports = function (src, dest, opts) {
  var deferred = Q.defer();

  rollup.rollup({
    input: src,
    external: generateExternalModulesList(),
    onwarn (warning, warn) {
      // skip certain warnings
      if (warning.code === 'UNRESOLVED_IMPORT') return
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
      if (warning.code === 'CIRCULAR_DEPENDENCY') return
      // Use default for everything else
      warn(warning)
    }
  }).then(async function (bundle) {
    var jsFile = pathUtil.basename(dest);
    var result = await bundle.generate({
      format: 'cjs',
      output: {
        sourceMap: !!(opts && opts.sourcemap),
        sourceMapFile: jsFile
      }
    });

    if (opts && opts.browserify) {
      // Browserify the code
      var b = browserify(intoStream(result.output[0].code), { basedir: opts.basedir, builtins: opts.browserifyBuiltins });
      b.exclude('electron');
      if (opts.excludeNodeModules) nodeBuiltInModules.forEach(m => b.exclude(m))
      if (opts.browserifyExclude) opts.browserifyExclude.forEach(m => b.exclude(m))
      var deferred2 = Q.defer();
      b.bundle(function (err, bundledCode) {
        if (err) deferred2.reject(err)
        else {
          jetpack.writeAsync(dest, bundledCode)
            .then(function () { deferred2.resolve() })
            .catch(function (err) { deferred2.reject(err) })
        }
      });
      return deferred2.promise;
    } else {
      // Wrap code in self invoking function so the variables don't
      // pollute the global namespace.
      var isolatedCode = '(function () {' + result.output[0].code + '\n}());';
      if (opts && opts.sourcemap) {
        return Q.all([
            jetpack.writeAsync(dest, isolatedCode + '\n//# sourceMappingURL=' + jsFile + '.map'),
            jetpack.writeAsync(dest + '.map', result.output[0].map.toString()),
          ]);
      }
      return jetpack.writeAsync(dest, isolatedCode)
    }
  }).then(function () {
    deferred.resolve();
  }).catch(function (err) {
    if (err.code === 'PARSE_ERROR') {
      console.log(err.loc)
      console.log(err.frame)
    }
    deferred.reject(err);
  });

  return deferred.promise;
};
