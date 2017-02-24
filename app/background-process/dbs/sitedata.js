import { app, ipcMain } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import rpc from 'pauls-electron-rpc'
import manifest from '../../lib/api-manifests/internal/sitedata'
import { cbPromise } from '../../lib/functions'
import { setupSqliteDB } from '../../lib/bg/db'
import { internalOnly } from '../../lib/bg/rpc'

// globals
// =
var db
var migrations
var setupPromise

// exported methods
// =

export function setup () {
  // open database
  var dbPath = path.join(app.getPath('userData'), 'SiteData')
  db = new sqlite3.Database(dbPath)
  setupPromise = setupSqliteDB(db, migrations, '[SITEDATA]')

  // wire up RPC
  rpc.exportAPI('beakerSitedata', manifest, { get, set, getPermissions, getPermission, setPermission }, internalOnly)
}

export function set (url, key, value) {
  return setupPromise.then(v => cbPromise(cb => {
    var origin = extractOrigin(url)
    if (!origin) return cb()
    db.run(`
      INSERT OR REPLACE
        INTO sitedata (origin, key, value)
        VALUES (?, ?, ?)
    `, [origin, key, value], cb)
  }))
}

export function get (url, key) {
  return setupPromise.then(v => cbPromise(cb => {
    var origin = extractOrigin(url)
    if (!origin) return cb()
    db.get(`SELECT value FROM sitedata WHERE origin = ? AND key = ?`, [origin, key], (err, res) => {
      if (err) return cb(err)
      cb(null, res && res.value)
    })
  }))
}

export function getPermissions (url) {
  return setupPromise.then(v => cbPromise(cb => {
    var origin = extractOrigin(url)
    if (!origin) return cb()
    db.all(`SELECT key, value FROM sitedata WHERE origin = ? AND key LIKE 'perm:%'`, [origin], (err, rows) => {
      if (err) return cb(err)

      // convert to a dictionary
      // TODO - pull defaults from browser settings
      var perms = { /*js: true*/ }
      if (rows) rows.forEach(row => { perms[row.key.slice('5')] = row.value })
      cb(null, perms)
    })
  }))
}

export function getNetworkPermissions (url) {
  return setupPromise.then(v => cbPromise(cb => {
    var origin = extractOrigin(url)
    if (!origin) return cb()
    db.all(`SELECT key, value FROM sitedata WHERE origin = ? AND key LIKE 'perm:network:%'`, [origin], (err, rows) => {
      if (err) return cb(err)

      // convert to array
      var origins = []
      if (rows) {
        rows.forEach(row => {
          if (row.value) origins.push(row.key.split(':').pop())
        })
      }
      cb(null, origins)
    })
  }))  
}

export function getPermission (url, key) {
  return get(url, 'perm:' + key)
}

export function setPermission (url, key, value) {
  value = !!value
  return set(url, 'perm:' + key, value)
}

export function query (values) {
  return setupPromise.then(v => cbPromise(cb => {
    // massage query
    if ('origin' in values) {
      values.origin = extractOrigin(values.origin)
    }

    // run query 
    const keys = Object.keys(values)
    const where = keys.map(k => `${k} = ?`).join(' AND ')
    const values = keys.map(k => values[k])
    db.all(`SELECT * FROM sitedata WHERE ${where}`, values, (err, res) => {
      if (err) return cb(err)
      cb(null, res && res.value)
    })
  }))
}

// internal methods
// =

function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol) return
  return (urlp.protocol + urlp.host)
}

migrations = [
  // version 1
  // - includes favicons for default bookmarks
  function (cb) {
    db.exec(`
      CREATE TABLE sitedata(
        origin NOT NULL,
        key NOT NULL,
        value
      );
      CREATE UNIQUE INDEX sitedata_origin_key ON sitedata (origin, key);
      INSERT OR REPLACE INTO "sitedata" VALUES('https:duckduckgo.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACkklEQVQ4T22SXUiTURjH/+ds2jTNPiTbXC1jbtAYaAh97cKBYlpWk+gDFhQUeOFFYBdCXqwQirqT6KKiDzTqIjIZpKG4YQsligLN3FzYcCWDPtaG7vuceN+Xzb3mA+fiff7P//c8530OwRoRtOn7QIhdJnHerx3wn11dTvITC7ZqJzjXcgIHAW4DRCvpPMiBDsLhACHB7QNzrVlfDhA4pl8E5yegUHpUpjokpt+tNRw4YxYQ8lw36FcLBSIg0FrtpDTVw1AwGdfXQFVvg6axDZSlETxT+x+IIrWPsYJunXOulbjqoawq1U9wQuuESra5ArsejstMIccFxD6+keUIZ+/no/795OsRwwAl5BEHfylUFN8bx8jbn7C3mURDdCmJ7z8iWNd5UA4AOc44PycAOMDDANkoVBTddSOFIiSTaeh15aKp/eoLdPlugkX+5EEkD/EfFgArEXE8gbl2D8KRGMo3rc8JoesnodKOoaRmGQs3NMj8VYga8a0ChOpPwXL5mrS8TBhsRpODhMdL8XtIHDQXxNsiv0KivBLmx2MSIBUCm63CvKMSLE6h2pkQT9i9QVClK3xprnZSsH4OxbMs1vjKm+vgbTGiUJ1EiSmGxGIhlj4XSaMjc5qB2sU1VqgMLgJYsq6yB26o1eI7gddWCx5flo0tTgd4QnGfVXxIM01GF2XozlB4xNV13cFgQR/OmzqRmv6ED8O9mDhQho7eBRGkYLAwip7dr70SQIipRmOUAIdA4AnvbcJT6zfEUnFQutL80q2A0NrCgWHziLdUukpeTDUYXcJncpvu/uyVo/0NO2zYWqxBdNKVDnRftIMo2wXdPOq1Zm0ygJAU/skWpWGIgzTI1gU++ivta7a6kc7P/wNyZ/k5PvUO0QAAAABJRU5ErkJggg==');
      INSERT OR REPLACE INTO "sitedata" VALUES('https:beakerbrowser.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABqUlEQVQ4T6WTMWgTURyHv3d3lORik9TmLovgZgpdBUGw4uBgFyVicVKKxaVQqLUQU6SUtFXQGOMgIrq4hULtILSLIEqWpl0KDtKhDmL1cok06ima3JOmIDkSh6tvfv/v93vf4y+48nEAVWRxOYq/U0LK64Kr26V9DO9FKawJRrZlp+AzJ3QSvSqaKnhr1Vl+43Ts90/Aq6kYG5/qBDRBT0BwIV/1Dzi9UCMRUpk5GeT8fZ+A11MxBhZq9OsKc6dCnMtVfDQIK1QyBr03y6BBedrASFvwvV1XRwfpoQjhAKSe7TRTc8NRPuy4ZBdrbS3aAd0CK2NiztpgN/YG4irWjRhmugyO64G0ASaSYQ5FFMYLNZLHgs3Li6sODy5G2Kq65J57W3gBuoI1b2Deshk/rnNvMNQETK443C06fE4dJJ62PS08gLGz3SQMjdEnX3h/x+RwVGkCNisuR1IWD0d6eGfXyS99/fsMD+BaMkyfoXK7+IMuDTQhkFLyS8LvBjwePMDT9Z8UXn7rDNiV9eJS1Cup5edsR3L5URVaPP7fMkFJ7HudFdZoyIk/JeikxGgqEfMAAAAASUVORK5CYII=');
      INSERT OR REPLACE INTO "sitedata" VALUES('https:groups.google.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACXElEQVQ4T6WTT0gUURzHv7uuIrlKByEWU3cREUWLcZSQDlnQMaSL69pBvHjvDyF0mCcEUqeoc0QH3U26dEnoVLew3Zak2mRZtmVb12VdZ7cER3bn/eK9NyNZdKk38+b3e3++n/n+hnke/GfzCL1pFoM+L+Y45wA4ZORcZGIo4/E5DqvReBoKaV8l4Hu1sPyp2LL4segD5wTiBE5KdDR25og4hgMWRgIHrKv37JIE1MyCsZY8wdaSfimwxWabVC4icQlVOSGim7g2VvsVkDdiiTYFICUUgMtDohLC+qZyIjsRZkZNzI7XWLfrwKzkjFjCz54l/Y598SkIr26qL3xh2VblOPCIXsWsbrLukKZKMMtZI/rez2KJdoycboIebMLjN5Z0QKQcLFxqw9v0IeKZQ1nCzFiV9bqASjljROMC0IFOvweBk17Ydh1aj0cC4lkOr9eHfKWBUtWWJUT0KuvtcxxUShljJd7GovEOLFxsRXOTB1c1C17pT1aD54lW1G3Co/WaBMyMmSzUp6sSyqW0sbLhZ9F4uxQQqYeoWeQqEiBuIoS1PYT1PdbXP64ApeKWsbrRzlaPAEpI4nJErtgFTI+arH/ABRRSxrss2MuNPSlyN0sXAHL7AexYnfLtok9rFUxrJhsYPKccFLPJIHwtc6mt9OS37dKkszFGxL+IdavRgieZK9qB3Twl1iaCP17fOL8zP6hNqF/ZbYXcByNf2GG5/PZiODx/7/dzNnxr9w5xfpc4sc8PTi2J9WOAfG7ztteDra6eMy/+dkiHru9OkV0fSD0M3P8D8C8n+ydF3pUgWpUjegAAAABJRU5ErkJggg==');
      PRAGMA user_version = 1;
    `, cb)
  },
  // version 2
  // - more favicons for default bookmarks
  function (cb) {
    db.exec(`
      INSERT OR REPLACE INTO "sitedata" VALUES('dat:1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB+0lEQVQ4T2NkoBAw4tDPOnPrkZfK0uKCTIwMDL9+/2E4de1uU12cTz26elwGsOT3zetvy47PufH0E8Onz28YHPVVpRkYGJ4RawBDxcxVXbUJwaUgAz5/ecPgoKfKw8DA8JWOBsxY1VWbSIELulbsWJEd6Bp+4+lHhp8/PzHMW7Nea05t4XWivFA+abG+j5PdBV1FKYZ7rz4zCPNwMGw9dmpTlr9DAAMDw39kQ7DFAuPMrUf2BtmaOv79+4/h+ccfDP//MzAw/vvOsHLPIfeO9IhdeA2omb02JMDBerWytBDDxy+/GD58+83w7/9/Bn4uNoaTV65fj3I21WFgYPgHMwTdBczL9p2972igIyvIw8rw8t1vhl9//oMN+P33HwMv51+G2Zt2ZbWkhkzHakDTos1l3rYmnWe/XmNQFhBniN/ZzsAIgowMDH///2PI1Q5lMGBRf7Niy07VBQ2FH0CGwF2QUd8t5uvld28vyxFuPzkbhtc/3jL0XFvBwMbMArYMFHK//v5h6NHJYjh28N7EiiivAhQD6udvaE3x8ai6++8xgziHAMOb328Zbn19wMAEygxQa/4x/mcw59BlePf8xz87HWVOkJlwF4TlVrgIi0vHMPz/jxQu6EH0HxJ6//++mllXWMvAwPADWQXIrWzI3sKT0/8yMDD8BBkFAKGg0xFAPKtMAAAAAElFTkSuQmCC');
      PRAGMA user_version = 2;
    `, cb)
  }
]