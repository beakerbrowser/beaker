# FG (foreground)

This folder contains frontend code that drives Jolly's UI.

Each folder is a self-contained UI component. Many folders have a 1:1 connection with a file in `/app/bg/ui/subwindows/*` such as `perm-prompt`, `prompts`, and `shell-menus`.

Notable folders:

 - `lib` is reusable code that's specific to frontend.
 - `shell-window` is the primary shell UI of Jolly.

 ## RPC

 Jolly's Web APIs are not available in these components. Therefore all RPC with the Electron process needs to be setup manually (thus the `bg-process-rpc.js` pattern).