// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import { app, Menu, BrowserWindow } from 'electron'
import buildMenu from './main/window-menu'
import env from './env';

var mainWindow;

app.on('ready', function () {
    Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu(env)));

    var mainWindow = new BrowserWindow({
        width: 1000,
        height: 600
    });

    mainWindow.loadURL('https://google.com');
});

app.on('window-all-closed', function () {
    app.quit();
});
