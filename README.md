Beaker Browser
======
[![Backers on Open Collective](https://opencollective.com/beaker/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/beaker/sponsors/badge.svg)](#sponsors)

![logo.png](build/icons/256x256.png)

Beaker is an experimental peer-to-peer Web browser. It adds new APIs for building hostless applications while remaining compatible with the rest of the Web. [Visit the website.](https://beakerbrowser.com/)

Please feel free to open usability issues. Join us at #beakerbrowser on Freenode.

### Sponsors

Sponsors support this project by contributing $100 a month or more. [Become a sponsor](https://opencollective.com/beaker#sponsor)

<a href="https://opencollective.com/beaker/sponsor/0/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/1/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/2/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/3/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/4/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/5/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/6/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/7/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/8/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/beaker/sponsor/9/website" target="_blank"><img src="https://opencollective.com/beaker/sponsor/9/avatar.svg"></a>

### Backers

Backers support this project by contributing $2 to $99 a month. [Become a backer](https://opencollective.com/beaker#backer)

<a href="https://opencollective.com/beaker#backers" target="_blank"><img src="https://opencollective.com/beaker/backers.svg?width=890"></a>

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installing](#installing)
  - [Binaries](#binaries)
  - [Building from source](#building-from-source)
- [Documentation](#documentation)
  - [Env Vars](#env-vars)
- [Vulnerability disclosure](#vulnerability-disclosure)
- [Known issues](#known-issues)
  - [tmux](#tmux)
- [Contributors](#contributors)
  - [Backers](#backers)
  - [Sponsors](#sponsors)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installing

### Binaries

**Visit the [Releases Page](https://github.com/beakerbrowser/beaker/releases) to find the installer you need.**

### Building from source

Requires node 12 or higher.

In Linux (and in some cases macOS) you need libtool, m4, autoconf, and automake:

```bash
sudo apt-get install libtool m4 make g++ autoconf # debian/ubuntu
sudo dnf install libtool m4 make gcc-c++ libXScrnSaver  # fedora
brew install libtool autoconf automake # macos
```

In Windows, you'll need to install [Python 2.7](https://www.python.org/downloads/release/python-2711/), Visual Studio 2015 or 2017, and [Git](https://git-scm.com/download/win). (You might try [windows-build-tools](https://www.npmjs.com/package/windows-build-tools).) Then run:

```powershell
npm config set python c:/python27
npm config set msvs_version 2015
npm install -g node-gyp
npm install -g gulp
```

To build:

```bash
git clone https://github.com/beakerbrowser/beaker.git
cd beaker/scripts
npm install # don't worry about v8 api errors building native modules - rebuild will fix
npm run rebuild # needed after each install. see https://github.com/electron/electron/issues/5851
npm start
```

If you pull latest from the repo and get weird module errors, do:

```bash
npm run burnthemall
```

This invokes [the mad king](http://nerdist.com/wp-content/uploads/2016/05/the-mad-king-game-of-thrones.jpg), who will torch your `node_modules/`, and do the full install/rebuild process for you.
(We chose that command name when GoT was still cool.)
`npm start` should work afterward.

If you're doing development, `npm run watch` to have assets build automatically.

## Documentation

Looking to work on Beaker? [Watch this video](https://www.youtube.com/watch?v=YuE9OO-ZDYo) and take a look at [the build notes](./build-notes.md).

- [Documentation site](https://beakerbrowser.com/docs/)
- **Web APIs**
  - [DatArchive](https://beakerbrowser.com/docs/apis/dat.html)
  - [Dat.json site manifest](https://beakerbrowser.com/docs/apis/manifest.html)
  - [See all](https://beakerbrowser.com/docs/apis/)

### Env Vars

- `DEBUG`: which log systems to output? A comma-separated string. Can be `beaker`, `dat`, `bittorrent-dht`, `dns-discovery`, `hypercore-protocol`. Specify `*` for all.
- `BEAKER_OPEN_URL`: open the given URL on load, rather than the previous session or default tab.
- `BEAKER_USER_DATA_PATH`: override the user-data path, therefore changing where data is read/written. Useful for testing. For default value see `userData` in the [electron docs](https://electron.atom.io/docs/api/app/#appgetpathname).
- `BEAKER_DAT_QUOTA_DEFAULT_BYTES_ALLOWED`: override the default max-quota for bytes allowed to be written by a dat site. Useful for testing. Default value is `'500mb'`. This can be a Number or a String. Check [bytes.parse](https://github.com/visionmedia/bytes.js/tree/a4b9af2bf289175f12b3538eb172f2489844b1ec#bytesparsestringnumber-value-numbernull) for supported units and abbreviations.

## Vulnerability disclosure

See [SECURITY.md](./SECURITY.md) for reporting security issues and vulnerabilities.

## Known issues

### tmux

Launching from tmux is known to cause issues with GUI apps in macOS. On Beaker, it may cause the application to hang during startup.

## Contributors

This project exists thanks to all the people who contribute. [[Contribute]](CONTRIBUTING.md).
[![](https://opencollective.com/beaker/contributors.svg?width=890)](https://github.com/beakerbrowser/beaker/graphs/contributors)

## License

MIT License (MIT)

Copyright (c) 2018 Blue Link Labs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
