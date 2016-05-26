// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu } from 'electron'
import * as windows from './background-process/windows'
import buildMenu from './background-process/window-menu'
import env from './env';

var mainWindow;

app.on('ready', function () {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(env)));
  windows.setup()
});

app.on('window-all-closed', function () {
  // it's normal for OSX apps to stay open, even if all windows are closed
  // but, since we have an uncloseable tabs bar, let's close when they're all gone
  app.quit();
});
