Beaker Browser
======

![logo.png](build/icons/256x256.png)

Beaker is an experimental Browser.
It adds new technologies for peer-to-peer applications while remaining compatible with the rest of the Web.
[Visit the website.](https://beakerbrowser.com/)

Please feel free to open usability issues. Join us at #beakerbrowser on Freenode.

## Binaries

### [OSX 64-bit .dmg](https://download.beakerbrowser.net/download/latest/osx)

#### Features

:zap: **Host sites and files from the browser**<br>
:zap: **Save sites for offline use**<br>
:zap: **Share files secretly between devices (secret URLs)**<br>
:zap: Fork sites to modify and share<br>
:zap: Versioned URLs for historic lookup<br>
:zap: Write peer-to-peer applications with new Web APIs<br>
:zap: Live reloading to speed up site development<br>
:zap: Native markdown (.md) rendering
 
#### Why Beaker? 
 
Beaker is better than the HTTP/S Web because:

 - Users can share files with end-to-end secrecy
 - Data published via the Dat peer-to-peer protocol is controlled by the user
 - Peer-to-peer websites can be forked, modified, and shared
 - Peer-to-peer websites work offline, because they don't rely on hosts
 - Peer-to-peer websites are versioned, so users can peg a version or view a website at any point in its history
 
Beaker is better than a blockchain Web because:

 - There's no Proof-of-Work or overhead for achieving global consensus
 - Users don't need to download a large dataset to participate (the blockchain history)
 - No upfront payment is required to participate
 
#### P2P Web APIs

An example of the [Dat peer-to-peer Web API](https://beakerbrowser.com/docs/apis/dat.html):

```js
var archive = await DatArchive.create({
  title: 'My Site',
  description: 'My peer-to-peer website'
})
await archive.writeFile('/hello.txt', 'hello')
await archive.commit()

console.log(archive.url)
// => dat://da2ce4..dc/
```

## Documentation

- **Inside Beaker**
  - :point_right: [The Dat files protocol](https://beakerbrowser.com/docs/inside-beaker/dat-files-protocol.html)
  - :point_right: [Privacy and security in Beaker](https://beakerbrowser.com/docs/inside-beaker/privacy-and-security.html)
  - :point_right: [The "Thick applications model"](https://beakerbrowser.com/docs/inside-beaker/thick-applications.html)
  - :point_right: [Why Dat vs Other technologies](https://beakerbrowser.com/docs/inside-beaker/other-technologies.html)
  - [Project mission](https://beakerbrowser.com/docs/inside-beaker/mission.html)
  - [Is Dat "Secure P2P?"](https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22)
  - [Worm Prevention (Security Discussion)](https://github.com/beakerbrowser/beaker/wiki/Worm-Prevention-(Security-Discussion))
- **Web APIs**
  - :point_right: [DatArchive](https://beakerbrowser.com/docs/apis/dat.html)
  - [Permissions](https://beakerbrowser.com/docs/apis/permissions.html)
  - [Dat.json site manifest](https://beakerbrowser.com/docs/apis/manifest.html)
- **Specs and Proposals**
  - [Dat DNS: Authenticated Dat URLs and HTTPS to Dat Discovery](https://github.com/beakerbrowser/beaker/wiki/Authenticated-Dat-URLs-and-HTTPS-to-Dat-Discovery) (Beaker's solution to DNS shortnames for Dat sites)
  - [Thick Applications: Unifying WebExtensions with the Web platform and moving beyond injections](https://github.com/beakerbrowser/beaker/wiki/Thick-Applications:-Unifying-WebExtensions-with-the-Web-platform-and-moving-beyond-injections)
  - [Service Discovery: PSA Web Service Discovery Protocol](https://github.com/beakerbrowser/beaker/wiki/PSA-Web-Service-Discovery-Protocol)
  - [App Scheme (dead spec)](https://github.com/beakerbrowser/beaker/wiki/App-Scheme)
- **Tutorials**
  - :point_right: [Create a peer-to-peer blog](https://beakerbrowser.com/docs/tutorials/create-a-blog.html)
  - :point_right: [Create a markdown site](https://beakerbrowser.com/docs/tutorials/create-a-markdown-site.html)
  - :point_right: [Host outside of Beaker](https://beakerbrowser.com/docs/tutorials/host-outside-of-beaker.html)
  - [Share files secretly](https://beakerbrowser.com/docs/tutorials/share-files-secretly.html)
  - [Code: Read site files](https://beakerbrowser.com/docs/tutorials/read-site-files.html)
  - [Code: Write site files](https://beakerbrowser.com/docs/tutorials/write-site-files.html)
  - [Code: Diff, commit, revert](https://beakerbrowser.com/docs/tutorials/diff-commit-revert.html)
  - [Code: Listen for file changes](https://beakerbrowser.com/docs/tutorials/listen-for-file-changes.html)
  - [Code: Create or fork a site](https://beakerbrowser.com/docs/tutorials/create-or-fork-a-site.html)

## Env Vars

- `DEBUG`: which log systems to output? A comma-separated string. Can be `beaker`, `dat`, `bittorrent-dht`, `dns-discovery`, `hypercore-protocol`. Specify `*` for all.
- `beaker_user_data_path`: override the user-data path, therefore changing where data is read/written. Useful for testing.
- `beaker_sites_path`: override the default path for saving sites. Useful for testing.
- `beaker_dat_quota_default_bytes_allowed`: override the default max-quota for bytes allowed to be written by a dat site. Useful for testing.

## Building from source

Requires node 6.2.1.
In linux (possibly also OSX) you need libtool, m4, automake, make, and g++.

```
sudo apt-get install libtool m4 automake make g++
```

To build:

```
git clone https://github.com/beakerbrowser/beaker.git
cd beaker
npm install
npm run rebuild #see https://github.com/electron/electron/issues/5851
npm start
```

If you pull latest from the repo and get weird module errors, do:

```
npm run burnthemall
```

This invokes [the mad king](http://nerdist.com/wp-content/uploads/2016/05/the-mad-king-game-of-thrones.jpg), who will torch your node_modules, and do the full install/rebuild process for you.
`npm start` should work afterwards.

If you're doing development, `npm run watch` to have assets build automatically.

## Running the tests

Tests use their own package.json:

```
cd tests
npm install
```

To run:

```
cd tests
npm test
```

## Known issues

### tmux

Launching from tmux is known to cause issues with GUI apps in MacOS. On Beaker, it may cause the application to hang during startup.

## License

Modified MIT License (MIT)

Copyright (c) 2017 Paul Frazee

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
