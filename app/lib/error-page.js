var errorPageCSS = `
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
a {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
}
.btn {
  display: inline-block;
  cursor: pointer;
  color: #5c5c5c;
  border-radius: 2px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  font-size: 12px;
  font-weight: 600;
  height: 25px;
  line-height: 25px;
  padding: 0 8px;
}
.btn * {
  cursor: pointer;
  line-height: 25px;
  vertical-align: baseline;
  display: inline-block;
}
.btn:focus {
  outline-color: #007aff;
}
.btn:hover {
  text-decoration: none;
  background: #f0f0f0;
}
.btn.disabled,
.btn:disabled {
  cursor: default;
  color: #999999;
  border: 1px solid #ddd;
  box-shadow: none;
}
.btn.disabled .spinner,
.btn:disabled .spinner {
  color: #aaa;
}
.btn.primary {
  -webkit-font-smoothing: antialiased;
  font-weight: 800;
  background: #007aff;
  color: #fff;
  border: none;
  transition: background .1s ease;
}
.btn.primary:hover {
  background: #0074f2;
}
a.btn span {
  vertical-align: baseline;
}
a.link {
  color: blue;
  text-decoration: underline;
}
div.error-page-content {
  max-width: 550px;
  margin: auto;
  margin-top: 30vh;
}
div.error-page-content .description {
  font-size: 14px;
  color: #707070;

  p {
    margin: 20px 0;
  }
}
div.error-page-content i {
  margin-right: 5px;
}
div.error-page-content .btn {
  float: right;
}
h1 {
  margin: 0;
  color: #333;
  font-weight: 400;
  font-size: 22px;
  padding-bottom: 10px;
  border-bottom: 1px solid #d9d9d9;
}
.icon {
  float: right;
}
.icon.warning {
  color: #e60b00;
}
li {
  margin-bottom: 0.5em;
}
li:last-child {
  margin: 0;
}
`

export default function (e) {
  var title = 'This site can’t be reached'
  var info = ''
  var icon = 'fa-info-circle'
  var button = '<a class="btn" href="javascript:window.location.reload()">Try again</a>'
  var errorDescription
  var moreHelp = ''

  if (typeof e === 'object') {
    errorDescription = e.errorDescription
    // remove trailing slash
    var origin = e.validatedURL.slice(0, e.validatedURL.length - 1)

    // strip protocol
    if (origin.startsWith('https://')) {
      origin = origin.slice(8)
    } else if (origin.startsWith('http://')) {
      origin = origin.slice(7)
    }

    switch (e.errorCode) {
      case -106:
        title = 'No internet connection'
        info = '<p>Your computer is not connected to the internet.</p><p>Try:</p><ul><li>Resetting your Wi-Fi connection<li>Checking your router and modem.</li></ul>'
        break
      case -105:
        info = `<p>Couldn’t resolve the DNS address for <strong>${origin}</strong></p>`
        break
      case -501:
        title = 'Your connection is not secure'
        info = `<p>Beaker cannot establish a secure connection to the server for <strong>${origin}</strong>.</p>`
        icon = 'fa-warning warning'
        button = '<a class="btn" href="javascript:window.history.back()">Go back</a>'
        break
      case 'dat-timeout':
        title = 'Timed out'
        info = `<p>It took too long to find this ${e.resource} on the peer-to-peer network.</p>`
        errorDescription = `Beaker will keep searching. Wait a few moments and try again.`
        moreHelp = `
          <p><strong>Troubleshooting</strong></p>
          <ul>
            <li>There may not be any peers hosting this ${e.resource} right now.<br /><a class="link" href="beaker://swarm-debugger/${e.validatedURL.slice('dat://'.length)}">Try the swarm debugger</a>.</li>
            <li>Your firewall may be blocking peer-to-peer traffic.<br /><a class="link" href="https://beakerbrowser.com/docs/using-beaker/troubleshooting.html" target="_blank">How to configure your firewall.</a></li>
          </ul>
        `
        break
    }
  } else {
    errorDescription = e
  }

  return `
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body>
        <style>${errorPageCSS}</style>
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="error-page-content">
          <h1>${title} <i class="icon fa ${icon}"></i></h1>
          <div class="description">
            ${info}
            ${moreHelp}
            <p>${errorDescription}</p>
          </div>
          ${button}
        </div>
      </body>
    </html>`.replace(/\n/g, '')
}
