import { app, ipcMain } from 'electron'
import sqlite3 from 'sqlite3'
import path from 'path'
import url from 'url'
import rpc from 'pauls-electron-rpc'
import manifest from '../api-manifests/sitedata'
import { cbPromise } from '../../lib/functions'
import { setupDatabase2 } from '../../lib/bg/sqlite-tools'
import log from '../../log'

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
  setupPromise = setupDatabase2(db, migrations, '[SITEDATA]')

  // wire up RPC
  rpc.exportAPI('beakerSitedata', manifest, { get, set })
}

export function set (url, key, value) {
  return setupPromise.then(v => cbPromise(cb => {
    var origin = extractOrigin(url)
    if (!origin)
      return cb()
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
    if (!origin)
      return cb()
    db.get(`SELECT value FROM sitedata WHERE origin = ? AND key = ?`, [origin, key], (err, res) => {
      if (err)
        return cb(err)
      cb(null, res && res.value)
    })
  }))
}

// internal methods
// =

function extractOrigin (originURL) {
  var urlp = url.parse(originURL)
  if (!urlp || !urlp.host || !urlp.protocol)
    return
  return (urlp.protocol + urlp.host + (urlp.port || ''))
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
      INSERT INTO "sitedata" VALUES('https:twitter.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACDUlEQVQ4T6WTT2hTQRDGZ3b3vSSFKhgjWq0ll4qgHtRjwN6CCA1J7bNasCieehCE3nrJUfSqoGgiBkGav/XgRQrVuxZUCpJaheih1oYqaE1e3uzIe5hi0j8GXHZvM7/95vt2Ef5zYSf9sfT7XjRkAjVKQfZ04XL/B7dvMPWuG0/cfWn0+YOTxbFwcjPYUOZjlA1fUQjVBQigqVFnovvAfKyha+cx9ujTUaWMN5rsB6s2jT+/FK41QcNZlkRLFanMHsA/YpmBvePMkL12DwdTlR5zR9dnYEbt1Mug7Ulphks5CymeqRyR/sBbFLJNHIPWdKtgha562LO5lQKiSLhkIAc0OcvAziyArAqffxxRtADcOmrYA6UL+15gPFM+LI3u66jM04BoeJWuRGBwNwr3jlavmTUQ1Q6VRg6UcWCW1e6vK4soxMH2wq0SYtbf8vPBICRRe+h4djkiUT5BxF2dxMrkZPLn9oy5tR5gOJuVpCN3pPKNAmBgO4jrv3b0yeJIaG4d4Bk59WUCpbr5zzE0pXJW6ErzkhZ3hqaqUSHxGgBEN1XB+tX3X86pZxf3/twAiD9c7GeUlvQFJoRUOzcq4Zm1+g/r6Wjf6t9wTKQXjoNhJlGZZ1Aq4WXefHVuosALwPpGfv52GpJJ3a5sfYTY42qvMjAimfdrQJORl0jT3LQVeg2AvJWxHf3G7VL5Dar41ek73hrnAAAAAElFTkSuQmCC');
      INSERT INTO "sitedata" VALUES('https:github.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACTklEQVQ4T42TMWgUURCGZ2b3zlySg9t9b0+RYGy0EARF0IiVoJ0WsRMMKEIkKCoIdjaWgmDEGAyoRewDKlaCnaIopLLQwigpYm7f3hlNTu/2zcjb3IUlhOh0b+bN92b+N4OwzpRSB1FkFImOIsCgCwvAV2F+JYhTxph3+RTMHfojpSYQcQQR8/61K7Jq0zVjLgLALxfoXuzXSr30iA6tr2ijs2V+GxtzzEEygFZq2iM6wyIf2NqHRDSGiHtEZCF7BXGbiHxk5knyvPOEeMAyP4mNGcEwDIcKnvcm61VkajGOLwCABwBbAGClU0EvAPwBAFvV+gEijjp/29rDqMLwke9555yDmSdqxlzarI1IqXtE5DSA1NrHWFXqCxLtdOr8XF7e0Ww25zcDlEqlgXJf3zcntDDPYVXrFBE9FqnX4jj8HxEjrRNCDETEOkAbEX0RSRfj2PXa/gekUNV6pZuDkdafCHGXS2ql6cl6vf58M0AQBCeKvv8s00zkM2ql7ntEY51fmHeQRqMxuxGkUqnsL/r+U0QccHHLPIlBEOwteN5syjxOiFVCPA0Ar1Pm60mSZN8blMtHCsXiLUAcQkTqPMZta/dlg6SUGveJLqet1nHw/WEE2G6Zz9br9R8uXi6XdW9PTy1fVcp81xhzpTvKRR2GM0S0m9P0Wot5YWlp6b1rs5PUszWKml2AtfZFnCTDTrb80viRUjcR8RoiFr/XaiUA+J0HsEgbRG7XjLnh5ii/TGvVVSqVQSI6lSTJndVNzsyN/FVmnmk0GnP5Vv4CJe8EOJlk4D4AAAAASUVORK5CYII=');
      INSERT INTO "sitedata" VALUES('http:dat-data.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABXklEQVQ4T2NkwAFW3dmosuTupmn/Gf8zhcl5ZMdqhN3EppQRXfD229t8LZemNt778jiXmZGZGST/+9/ffwp80lOb9PJrlYWUPyLrQTEg62h11p3PD5t+/PkhzMwI1gsHf///Y2BnYvugwi9fN82qdQojI+N/kCTYgLrTPa5n3l6Z8PH3Jy02JlZcvgKL//73h4GPlfemgahGfptxxU6wAY5bw38wMDCw49WJLvn//8/9Pqs4wAa4bov6+ef/XzZSDGBhZP6122sZ+6gB1AoDsqKRgeHnfu+VkGisOdPldv7t9Qkff33SZGViISoh6QprFHaaVmyHJ+X///8zZh2pzrr7+VHzj38/BZkZmTCTMgvbB1Vu+YapNq2TUJIyssq77+7y11+c3Pjgy+NcFkZmJlBiB2UmRR6pac0GRbWKgoofcGYmZImld9eorry7fSoDw3/mQHmv7ET1kBvY/AYAVPawEUn/6bwAAAAASUVORK5CYII=');
      INSERT INTO "sitedata" VALUES('https:duckduckgo.com','favicon','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACkklEQVQ4T22SXUiTURjH/+ds2jTNPiTbXC1jbtAYaAh97cKBYlpWk+gDFhQUeOFFYBdCXqwQirqT6KKiDzTqIjIZpKG4YQsligLN3FzYcCWDPtaG7vuceN+Xzb3mA+fiff7P//c8530OwRoRtOn7QIhdJnHerx3wn11dTvITC7ZqJzjXcgIHAW4DRCvpPMiBDsLhACHB7QNzrVlfDhA4pl8E5yegUHpUpjokpt+tNRw4YxYQ8lw36FcLBSIg0FrtpDTVw1AwGdfXQFVvg6axDZSlETxT+x+IIrWPsYJunXOulbjqoawq1U9wQuuESra5ArsejstMIccFxD6+keUIZ+/no/795OsRwwAl5BEHfylUFN8bx8jbn7C3mURDdCmJ7z8iWNd5UA4AOc44PycAOMDDANkoVBTddSOFIiSTaeh15aKp/eoLdPlugkX+5EEkD/EfFgArEXE8gbl2D8KRGMo3rc8JoesnodKOoaRmGQs3NMj8VYga8a0ChOpPwXL5mrS8TBhsRpODhMdL8XtIHDQXxNsiv0KivBLmx2MSIBUCm63CvKMSLE6h2pkQT9i9QVClK3xprnZSsH4OxbMs1vjKm+vgbTGiUJ1EiSmGxGIhlj4XSaMjc5qB2sU1VqgMLgJYsq6yB26o1eI7gddWCx5flo0tTgd4QnGfVXxIM01GF2XozlB4xNV13cFgQR/OmzqRmv6ED8O9mDhQho7eBRGkYLAwip7dr70SQIipRmOUAIdA4AnvbcJT6zfEUnFQutL80q2A0NrCgWHziLdUukpeTDUYXcJncpvu/uyVo/0NO2zYWqxBdNKVDnRftIMo2wXdPOq1Zm0ygJAU/skWpWGIgzTI1gU++ivta7a6kc7P/wNyZ/k5PvUO0QAAAABJRU5ErkJggg==');
      PRAGMA user_version = 1;
    `, cb)
  }
]