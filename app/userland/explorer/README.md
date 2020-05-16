# Hyperdrive.Network

An application for viewing and modifying Hyperdrives. Requires a Hyperdrive-enabled browser.

## Development

Run `npm install` to install dev deps.

Run `npm run dev` to start a local http server against the development code.

Edit your `/etc/hosts` to include a `dev.hyperdrive.network` which points to localhost. (The address is required for Beaker to provide the correct permissions to the application.)

## Building

Run `npm run build` to produce `./build`. You can serve the build using `npm run prod`.