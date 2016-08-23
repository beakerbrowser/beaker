# Howto: Authoring Beaker Plugins

You can add new Web APIs and URL schemes with plugins.
These are not like Chrome or Firefox plugins, as they do not let you change the UI or alter page behaviors.
Instead, they add Web APIs and URL schemes, so that technology teams can experiment with the Web platform.

## Overview

Beaker plugins are node modules with a name that follows the form of `beaker-plugin-*`.
For example, `beaker-plugin-dat` and `beaker-plugin-ipfs` are valid plugin names.

On load, Beaker will find all modules that fit that name-scheme in the global `node_modules` directory, and load them.

For reference, see [beaker-plugin-dat](https://github.com/pfrazee/beaker-plugin-dat), [beaker-plugin-ipfs](https://github.com/pfrazee/beaker-plugin-ipfs), and [beaker-plugin-example](https://github.com/pfrazee/beaker-plugin-example).

To install a new plugin, install it locally using npm, then rebuild Beaker from source.
For example, to install the example plugin:

```bash
cd ~/beaker # a cloned copy of beaker
npm install beaker-plugin-example
npm run rebuild
npm start
```

## Exported API

An example plugin, extracted from [beaker-plugin-dat](https://github.com/pfrazee/beaker-plugin-dat):

```js
module.exports = {
  configure (opts) {
    if (opts.logLevel)
      log.setLevel(opts.logLevel)
  },
  homePages: [{
    label: 'Dat Sites',
    href: 'view-dat://_sites'
  }],
  webAPIs: [{
    name: 'datInternalAPI',
    isInternal: true,
    manifest: {,
      getOwnedArchives: 'promise',
      getArchiveInfo: 'promise'
    },
    methods: {,
      getArchiveInfo: dat.getArchiveInfo,
      getOwnedArchives: dat.getOwnedArchives
    }
  }],
  protocols: [{
    scheme: 'dat',
    label: 'Dat Network',
    isStandardURL: true,
    isInternal: false,
    contextMenu: [{
      label: 'View Site Files',
      click: (win, props) => {
        var urlp = url.parse(props.frameURL||props.pageURL)
        if (urlp && urlp.hostname)
          win.webContents.send('command', 'file:new-tab', 'view-dat://'+urlp.hostname+'/')
      }
    }],
    register: datProtocol.register
  }, {
    scheme: 'view-dat',
    label: 'Dat Network',
    isStandardURL: true,
    isInternal: true,
    register: viewDatProtocol.register
  }]
}
```

The plugin should export an object that fits the following schema:

```js
{
  configure: optional function,
  homePages: optional array,
  webAPIs: optional array,
  protocols: optional array,
}
```

Where:

- `configure`: a function with the signature `(opts)`. Called by Beaker to set configuration parameters. Valid options:
  - `logLevel`: string. Tells the plugin how much logging it should do. Can be one of 'trace', 'debug', 'info', 'warn', 'error'.
- `homePages`: an array specifying links that should be added to Beaker's home nav. Each item should be an object with the following attributes:
  - `label`: required string. The label on the link.
  - `href`: required string. The URL that the link points to.
- `webAPIs`: an array specifying APIs that should be injected into web pages. Each item should be an object with the following attributes:
  - `name`: required string. The variable-name which the API will be given, when attached to the `window` object. For instance, 'foobar' will be assigned to `window.foobar`.
  - `isInternal`: optional bool. Is the API only safe to export on protocols that are also marked `isInternal`? Should be used on any API that gives access to resources that aren't safe for untrusted content.
  - `manifest`: required object. An [API Manifest](#api-manifests).
  - `methods`: required object. The API implementation.
- `protocols`: an array specifying URL schemes that should be added to Beaker. Each item should be an object with the following attributes:
  - `scheme`: required string. The URL scheme to be used.
  - `register`: required function. Called during Beaker's load-process. The function should use electron's [protocol API](http://electron.atom.io/docs/api/protocol/) to register its URI scheme.
  - `label`: optional string. A human-readable label for the protocol, which will be put in the url bar.
  - `isStandardURL`: optional bool. Does the URL follow the [generic URI syntax](http://electron.atom.io/docs/api/protocol/#protocolregisterstandardschemesschemes)?
  - `isInternal`: optional bool. Does this scheme serve only trusted content, making it safe to provide it the APIs which are also marked `isInternal`?
  - `contextMenu`: optional array. Provides items that should be added to the rightclick context-menu for pages of the scheme. Each item should be an object with the following attributes:
    - `label`: required string. The item label.
    - `click`: required function. Takes `(win, props)`, where `win` is a [BrowserWindow](http://electron.atom.io/docs/api/browser-window/) and `props` is an object containing the [params object from Electron's context-menu event](http://electron.atom.io/docs/api/web-contents/#event-context-menu).

## API Manifests

The API manifest is an object listing all of the methods in a Web API, and what their behavior is.
All of the plugins' Web APIs occur over RPC, so any data "returned" must be serializable as JSON.
See also: the [RPC library](https://github.com/pfrazee/pauls-electron-rpc).

The valid types are:

 - 'sync': Blocks the page's thread and returns a value directly.
 - 'async': Has a final callback parameter.
 - 'promise': Returns a promise.
 - 'readable': Returns a readable stream.
 - 'writable': Returns a writable stream.

The manifest object should look like:

```js
{
  [methodName]: methodBehavior
}
```

For example, here is a manifest which includes one of each possible type:

```js
{
  foo: 'sync',
  bar: 'async',
  baz: 'promise',
  bum: 'readable',
  bub: 'writable'
}
```

And here are the matching implementations:

```js
{
  foo: function () {
    return 'hi'
  },
  bar: function (cb) {
    cb(null, 'hi')
  },
  baz: function () {
    return Promise.resolve('hi')
  },
  bum: function () {
    return fs.createReadStream('hi.txt')
  },
  bub: function () {
    return fs.createWriteStream('hi.txt')
  }
}
```