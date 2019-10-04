# FG (foreground)

This folder contains frontend code that drives Beaker's UI.

Each folder is a self-contained UI component. Many folders have a 1:1 connection with a file in `/app/bg/ui/subwindows/*` such as `perm-prompt`, `prompts`, and `shell-menus`.

Notable folders:

 - `lib` is reusable code that's specific to frontend.
 - `shell-window` is the primary shell UI of Beaker.
 - `builtin-pages` is largely legacy code which is either inactive or waiting for an update. Unlike the rest of Beaker's UI, it still uses the "yo-yo" templating module and .less (whereas the rest of Beaker uses LitHTML and LitElements). It also really ought to be in `/app/userland` (my mistake) but I'm not bothering to fix it because this code really ought to be replaced and removed.

 ## RPC

 Beaker's Web APIs are not available in these components (except for everything in `builtin-pages`, see the note above). Therefore all RPC with the Electron process needs to be setup manually (thus the `bg-process-rpc.js` pattern).