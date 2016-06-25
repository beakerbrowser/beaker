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

## API Docs

 - [beaker.fs](./doc/api/beaker.fs.md)

## tech integrations

If you have tech that needs a browser, make a fork, open an issue, try out your integration, and PR back to here.

**integrations in progress**

 - [Dat](http://dat-data.com/). Used to serve applications, and provided as a permissioned API.
 - [IPFS](https://ipfs.io/). Used to serve applications, and provided as a permissioned API.
 - [node fs api](./doc/api/beaker.fs.md). Provided as a permissioned API.

**planned integrations**

 - Sqlite3. Provided as a permissioned API.
 - [libsodium](https://github.com/jedisct1/libsodium). Provided as an open API.
 - [Firefox sync](https://github.com/mozilla-services/syncclient). Proposed by the community in https://github.com/pfraze/beaker/issues/7, to enable users to switch quickly between firefox and beaker.

**proposed integrations**

 - [magic wormhole](https://github.com/warner/magic-wormhole)
 - [interledger](https://interledger.org/)
 - keybase ([discussion](./doc/discuss-notes/0001-keybase.md))
 - matrix ([matrix-js-sdk](https://www.npmjs.com/package/matrix-js-sdk), [homepage](https://matrix.org/))

## todo list

### basic ui

Basic browsing UI.
Please feel free to open usability issues.

  - tabs
    - [ ] reordering
    - [ ] pinning
    - [ ] dropdown when there are too many?
  - webview behaviors
    - [ ] restore scroll-position on back btn [electron issue](https://github.com/electron/electron/issues/5884)
    - [ ] restore session history on "re-open closed tab" [electron issue](https://github.com/electron/electron/issues/5885)
  - bookmarking
    - [ ] store favicons
    - [ ] bookmark folders
    - [ ] editable titles
  - context menu
    - [ ] save image as...
    - [ ] video/audio element controls

### dat integration

  - [ ] "Save dat archive..."
  - view-dat://
    - [ ] use the archive's dns name, if available
    - [ ] show item sizes
    - [ ] render README.md ?
  - expose dat API to applications

### privacy, security

Some basic necessities

 - [ ] block ads
 - [ ] incognito mode only. add opt-in 
 - [ ] try HTTPS before trying 
 - [ ] try to remove things that make fingerprinting possible
 - [ ] put webrtc (and other leaky apis) behind perms prompts

More advanced goals:

 - [ ] site version control (https://github.com/substack/hyperboot)
 - [ ] sandbox permission-trading: new features (such as FS access) are made available after other rights (such as XHR) are dropped

### user identity

something close to (if not cloned from) mozilla's persona project.
or, may consider using https://github.com/google/end-to-end.
should work across devices

 - [ ] naming/addressing (bob@foo.com ?)
 - [ ] key management, store secrets safely
 - [ ] look into supporting SSL client certificates

### cross-host data publishing

we need a data layer that is addressable and manipulable across different hosts. the way to do this is to use cryptographic referenced data structures (sha256 URIs for static content, and pubkey URIs for dynamic content)

https://github.com/mafintosh/hyperlog
and
https://github.com/mafintosh/hyperdrive
provides 2 crypto-addressed data types (logs, file archives) with p2p syncing protocols

 - [ ] hyperlog/hyperdrive APIs

### peer-to-peer messaging layer

 - [ ] webrtc signalling. needs to integrate with user identity layer, so channels can be opened using another user's ID. (matrix protocol?)
 - [ ] mail protocol. SMTP? not sure.

### user storage

 - [ ] local filesystem API
 - [ ] remote filesystem API (nfs?)
 - [ ] sqlite API

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
