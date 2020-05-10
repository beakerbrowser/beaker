beaker browser was cloned from [electron-boilerplate](https://github.com/szwacz/electron-boilerplate).

# Structure

There are **two** `package.json` files:  

#### 1. For development
Sits on path: `beaker-browser/scripts/package.json`. Here you declare dependencies for the development environment and build scripts. **This folder is not distributed with real application!**

#### 2. For the application
Sits on path: `beaker-browser/app/package.json`. This is **real** manifest of the application. Declare the app dependencies here.

#### OMG, but seriously why there are two `package.json`?
1. Native npm modules (those written in C, not JavaScript) need to be compiled, and here we have two different compilation targets for them. Those used in application need to be compiled against electron runtime, and all `devDependencies` need to be compiled against your locally installed node.js. Thanks to having two files this is trivial.
2. When you package the app for distribution there is no need to add up to size of the app with your `devDependencies`. Here those are always not included (because reside outside the `app` directory).

### Project's folders

- `app` - application code.
- `app/background-process` - main electron process.
- `app/builtin-pages` - start page, config page, etc.
- `app/lib` - shared lib code for code that's not in the background process (builtin-pages, shell-window, webview-preload).
- `app/shell-window` - the ui controls code (tabs, addressbar, etc).
- `app/stylesheets` - styles shared across the app.
- `app/webview-preload` - scripts injected into web pages.
- `dist` - in this folder lands built, runnable application.
- `build` - resources needed for building the app.


# Development

#### Installation

```
cd scripts
npm install
```
It will also download Electron runtime, and install dependencies for second `package.json` file inside `app` folder.

#### Starting the app

```
cd scripts
npm start
```

#### Adding npm modules to your app

Remember to add your dependency to `app/package.json` file, so do:
```
cd app
npm install name_of_npm_module --save
```

# Making a release


To make ready for distribution installer use command:
```
cd scripts
npm run release
```
It will start the packaging process for operating system you are running this command on. Ready for distribution file will be outputted to `dist` directory.

You can create Windows installer only when running on Windows, the same is true for Linux and OSX. So to generate all three installers you need all three operating systems.
