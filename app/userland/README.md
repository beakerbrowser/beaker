# Userland

This folder contains frontend (aka "fg") code which is executed in the same environment as any userland page. This means that, unlike the code in `/app/fg`, the standard Web APIs are available (due to `webview-preload.js` being injected).

Each folder in `/app/userland` is hosted at its own domain under `beaker://`. You can think of each folder being its own app. (Note: the "viewer" app contains multiple sub apps.)

The `beaker://app-stdlib` contains a number of components which are reused across userland apps. When possible, userland apps are not built. A build-step is used when the userland app needs to share code with beaker's internal code, as is the case for "library" and "site-info."

Generally speaking, every app in `/app/userland` should be a candidate to be moved into hyperdrive. If there's no chance an app be may moved into a hyperdrive, it should probably be put into `/app/fg`.