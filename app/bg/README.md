# BG (background)

This folder contains backend code that drives Beaker's main electron process.

Notable folders:

 - `lib` is reusable code that's specific to backend.
 - `dat` manages the dat daemon and any dat-specific behaviors.
 - `dbs` contains all sqlite databases and manages any data persisted to them.
 - `filesystem` manages the user's primary hyperdrive and manages any data which is persisted to it. This includes the dats library and users.
 - `protocols` contains the custom URL scheme handlers.
 - `rpc-manifests` contains the RPC manifests for internal RPC that's leveraged by `/app/fg` components.
 - `ui` contains the code which manages windows, tabs, subwindows, and everything about the user interface.
 - `web-apis` contains all interfaces which are exposed to the userland environment via RPC. It currently contains both fg and bg code (which maybe ought to change).
