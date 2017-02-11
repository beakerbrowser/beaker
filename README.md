beaker browser
======

![logo.png](build/icons/256x256.png)

Beaker is an experimental Browser.
It adds new technologies for Peer-to-Peer applications while staying compatible with the rest of the Web.
[Visit the website.](https://beakerbrowser.com/)

Please feel free to open usability issues. Join us at #beakerbrowser on Freenode.

## Binaries

### [OSX 64-bit](https://download.beakerbrowser.net/download/latest/osx)

## CLI Tool

Beaker has [a handy CLI tool called bkr](https://github.com/beakerbrowser/bkr).

```
npm install -g bkr
```

## Documentation

- [Beaker Docs](https://beakerbrowser.com/docs/)

## Env Vars

- `DEBUG`: which log systems to output? A comma-separated string. Can be `beaker`, `dat`, `ipfs`, `bittorrent-dht`, `dns-discovery`, `hypercore-protocol`. Specify `*` for all.
- `beaker_user_data_path`: override the user-data path, therefore changing where data is read/written. Useful for testing.
- `beaker_dat_quota_default_bytes_allowed`: override the default max-quota for bytes allowed to be written by a dat site. Useful for testing.

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

## Building from source

Requires node 6.2.1.
In linux (possibly also OSX) you need libtool, m4, and automake.

```
sudo apt-get install libtool m4 automake
```

To build:

```
git clone https://github.com/pfrazee/beaker.git
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

## Known issues

### tmux

Launching from tmux is known to cause issues with GUI apps in MacOS. On Beaker, it may cause the application to hang during startup.

## License

Modified MIT License (MIT)

Copyright (c) 2016 Paul Frazee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

 1. Any project using the Software will include a link to the Beaker project page,
along with a statement of credit. (eg "Forked from Beaker")

 2. The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
