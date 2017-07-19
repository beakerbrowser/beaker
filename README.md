Beaker Browser
======

![logo.png](build/icons/256x256.png)

Beaker is an experimental peer-to-peer Web browser. It adds new APIs for building hostless applications, while remaining compatible with the rest of the Web. [Visit the website.](https://beakerbrowser.com/)

Please feel free to open usability issues. Join us at #beakerbrowser on Freenode.

## Binaries

### [OSX 64-bit .dmg](https://download.beakerbrowser.net/download/latest/osx)

## About

Beaker is a new browser that combines the flexibility of the desktop with the connectivity of the Web.

### Why Beaker?

 - You can share files privately
 - You control your data
 - You can duplicate, modify, and share websites
 - You can use apps while offline
 - You can go back in time and see previous verions of your content
 
### Features

 - Host sites from the browser
 - Save sites for offline use
 - Share files secretly between devices
 - Versioned URLs for historic lookup
 - New Web APIs
 - Live reloading
 - Native markdown (.md) rendering

With Beaker, we're combining the flexibility of the desktop with the connectivity of the Web.

#### New Web APIs

An example of the [Dat Files API](https://beakerbrowser.com/docs/apis/dat.html):

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

Looking to work on Beaker? [Watch this video](https://www.youtube.com/watch?v=YuE9OO-ZDYo) and take a look at [the build notes](./build-notes.md).

- **Web APIs**
  - [DatArchive](https://beakerbrowser.com/docs/apis/dat.html)
  - [Permissions](https://beakerbrowser.com/docs/apis/permissions.html)
  - [Dat.json site manifest](https://beakerbrowser.com/docs/apis/manifest.html)
- **Specs**
  - Implemented
    - [Dat files protocol](https://beakerbrowser.com/docs/inside-beaker/dat-files-protocol.html)
    - [Dat DNS](https://github.com/beakerbrowser/beaker/wiki/Authenticated-Dat-URLs-and-HTTPS-to-Dat-Discovery)
  - Proposed
    - [Installable Web Applications](https://github.com/beakerbrowser/beaker/wiki/Installable-Web-Applications)
    - [Intents](https://github.com/beakerbrowser/beaker/wiki/Intent-Scheme) a URI scheme for composing interactions between apps
    - [Service Discovery](https://github.com/beakerbrowser/beaker/wiki/PSA-Web-Service-Discovery-Protocol)
    - [WebTerm](https://github.com/beakerbrowser/beaker/wiki/WebTerm) a bashlike terminal for Web
  - Dead
    - [App Scheme](https://github.com/beakerbrowser/beaker/wiki/App-Scheme)
- [**Tutorials**](https://beakerbrowser.com/docs/tutorials/)

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

In Fedora:

```
sudo dnf install libtool m4 make gcc-c++
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
