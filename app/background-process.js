// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu } from 'electron'
import { create } from './background-process/windows'
import buildMenu from './background-process/window-menu'
import env from './env';

var mainWindow;

app.on('ready', function () {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(env)));

  var mainWindow = create({
    width: 1000,
    height: 600
  })
});

app.on('window-all-closed', function () {
  app.quit();
});
