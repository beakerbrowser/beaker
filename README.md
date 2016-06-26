beaker browser
======

This is a highly opinionated and standards-noncompliant browser.
It has its own APIs for decentralized software.

Please feel free to open usability issues.

![screenshot.png](screenshot.png)

## building and project structure

```
git clone https://github.com/pfraze/beaker.git
cd beaker
npm install
npm start
```

If you are using a node version ealier than 6, you may receive an error about a module version mismatch.
If so, run the following command after `npm install`, to have the modules rebuild into the version you need:

```
npm run rebuild
```

[Lots of dev instructions and notes here](./build-notes.md)

## api docs

#### [beaker.fs](./doc/api/beaker.fs.md)

## tech integrations

If you have tech that needs a browser, make a fork, open an issue, try out your integration, and PR back to here.

**in progress**

 - [Dat](http://dat-data.com/). Used to serve applications, and provided as a permissioned API.
 - [IPFS](https://ipfs.io/). Used to serve applications, and provided as a permissioned API.
 - [Node filesystem](./doc/api/beaker.fs.md). Provided as a permissioned API.

**planned**

 - [Sqlite3](https://www.sqlite.org/). Provided as an open API, within the FS api.
 - [Libsodium](https://github.com/jedisct1/libsodium). Provided as an open API.
 - [Firefox Sync](https://github.com/mozilla-services/syncclient). Proposed by the community in https://github.com/pfraze/beaker/issues/7, to enable users to switch quickly between firefox and beaker.

**proposed**

 - [magic wormhole](https://github.com/warner/magic-wormhole)
 - [interledger](https://interledger.org/)
 - keybase ([discussion](./doc/discuss-notes/0001-keybase.md))
 - matrix ([matrix-js-sdk](https://www.npmjs.com/package/matrix-js-sdk), [homepage](https://matrix.org/))

## license

The MIT License (MIT)

Copyright (c) 2016 Paul Frazee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
