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

## discussion

 - [0001 Keybase, global userids and pubkey certs](./doc/discuss-notes/0001-keybase.md). An argument for integrating keybase.
   - Related video: [BlackHat USA 2011: SSL And The Future Of Authenticity](https://www.youtube.com/watch?v=Z7Wl2FW2TcA). Discusses problems with the CA model of authentication, and suggests using network "notaries" to validate certificates.
 - [0002 Hyperboot, application delivery safety](./doc/discuss-notes/0002-hyperboot.md).
 - [0003 HTTP legacy](./doc/discuss-notes/0003-http-legacy.md). The argument for continuing to support HTTP/S.

## tech integrations

If you have tech that needs a browser, make a fork, open an issue, try out your integration, and PR back to here.

### planned integrations

#### dat ([link](http://dat-data.com/))

Dat provides a data layer that is addressable across hosts, using public keys (for append-only logs) and hash-addresses (for file archives).
It discovers peers with the Bittorrent DHT, centralized DNS servers and Multicast DNS simultaneously.

([how dat works](https://dat-data.readthedocs.io/en/latest/how-dat-works/))

 - [hyperdrive](https://www.npmjs.com/package/hyperdrive) - The file sharing network dat uses to distribute files and data. A technical specification / discussion on how hyperdrive works is [available here](https://github.com/mafintosh/hyperdrive/blob/master/SPECIFICATION.md)
 - [hypercore](https://www.npmjs.com/package/hypercore) - exchange low-level binary blocks with many sources
 - [discovery-channel](https://www.npmjs.com/package/discovery-channel) - discover data sources
 - [discovery-swarm](https://www.npmjs.com/package/discovery-swarm) - discover and connect to sources
 - [bittorrent-dht](https://www.npmjs.com/package/bittorrent-dht) - use the Kademlia Mainline DHT to discover sources
 - [dns-discovery](https://www.npmjs.com/package/dns-discovery) - use DNS name servers and Multicast DNS to discover sources

#### libsodium ([link](https://github.com/jedisct1/libsodium))

Sodium is a modern and easy-to-use crypto library.
Beaker will use [node-sodium](https://github.com/paixaop/node-sodium) bindings to import the API into the JS environment.

### proposed integrations

 - [magic wormhole](https://github.com/warner/magic-wormhole)
 - [IPFS](https://ipfs.io/)
 - [interledger](https://interledger.org/)
 - keybase ([discussion](./doc/discuss-notes/0001-keybase.md))
 - SQLite
 - node `fs` module
 - matrix ([matrix-js-sdk](https://www.npmjs.com/package/matrix-js-sdk), [homepage](https://matrix.org/))

## todo list

### basic ui

Basic browsing UI.
Please feel free to open usability issues.

  - un/happiness reporter
    - [ ] ui to report that you're happy or unhappy, and why
    - [ ] server to collect reports
  - tabs
    - [ ] favicons
    - [ ] reordering
    - [ ] pinning
  - webview behaviors
    - [ ] restore scroll-position on back btn [electron issue](https://github.com/electron/electron/issues/5884)
    - [ ] restore session history on "re-open closed tab" [electron issue](https://github.com/electron/electron/issues/5885)
    - zoom
      - [ ] persist zoom on domains
      - [ ] show current zoom in toolbar
  - bookmarking
    - [ ] bookmark btn on toolbar
    - [ ] store bookmarks
    - [ ] store favicons
  - context menu
    - [ ] save image as...
    - [ ] video/audio element controls

### dat integration

  - [ ] "Save dat archive..."
  - pinning
    - is pinning the same as bookmarking?
    - [ ] pin btn in toolbar (view-dat: and dat:)
    - [ ] save pinned dats to disk 
    - [ ] delete unpinned dats
    - [ ] show pinned dats in start page
  - view-dat://
    - [ ] show item sizes
    - [ ] render README.md ?
  - dat://
    - [ ] If index.html does not exist, but the archive was found, redirect to view-dat://
    - [ ] solve issue causing slow sync
    - [ ] add webrtc as a transport

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
