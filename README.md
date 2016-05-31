beaker browser
======

This is a highly opinionated and standards-noncompliant browser.
It has its own APIs for decentralized software.
It may contain unstable compounds.

![screenshot.png](screenshot.png)

## building and project structure

```
git clone https://github.com/pfraze/beaker-browser.git
cd beaker-browser
npm install
npm start
```

[Lots of dev instructions and notes here](./build-notes.md)

## discussion

 - [0001 Keybase, global userids and pubkey certs](./doc/discuss-notes/0001-keybase.md). An argument for integrating keybase.
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

 - keybase ([discussion](./doc/discuss-notes/0001-keybase.md))
 - SQLite
 - node `fs` module

## todo list

### basic ui

Just needs to get the job done, not a lot of features here

  - browser controls
    - [x] nav btns: Back, Forward, Refresh
    - [ ] tabs
      - [x] basic
      - [x] tab titles
      - [ ] tab favicons
      - [ ] tab pinning
      - [ ] change how webviews are hidden, so they dont have to relayout on select
    - [x] address bar
      - [x] indicate loading state
      - [x] improve valid URL detection (vs search query)
    - [ ] status bar
    - [ ] bookmark btn
  - builtin pages
    - [ ] start page (show bookmarks)
    - [ ] load failure pages (did-fail-load)
  - inpage controls
    - [x] find ui
    - [x] context menu
      - [ ] save image as...
      - [ ] video/audio element controls
    - [x] open-in-new-tab (ctrl/cmd+click)
  - input
    - [x] keybindings / app menu
      - [x] basic
      - [x] reopen-closed-tab
        - [ ] restore session history as well as the URL
      - [x] open-file
      - [x] cmd/ctrl+1-9 to switch tab
      - [x] page zoom
        - [ ] persist zoom as a domain setting
    - [x] swipe gestures

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

we need a data layer that is addressable and manipulable across different hosts. the way to do this is to use cryptographic references: sha256 URIs (for static content) and pubkey URIs (for dynamic content)

https://github.com/mafintosh/hypercore
and
https://github.com/mafintosh/hyperdrive
provide 2 data types (feeds, files) and include p2p syncing protocols

 - [ ] hypercore/hyperdrive APIs

### peer-to-peer messaging layer

 - [ ] webrtc signalling. needs to integrate with user identity layer, so channels can be opened using another user's ID.
 - [ ] mail protocol. SMTP? not sure.

### user storage

 - [ ] local filesystem API
 - [ ] remote filesystem API (ldap?)
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
