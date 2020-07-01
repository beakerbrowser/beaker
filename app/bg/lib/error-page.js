var errorPageCSS = `
* {
  box-sizing: border-box;
}
a {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
body {
  background: #fff;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
}
.btn {
  display: inline-block;
  cursor: pointer;
  color: #777;
  border-radius: 2px;
  background: #fafafa;
  border: 1px solid #ddd;
  font-size: 12px;
  font-weight: 500;
  height: 25px;
  line-height: 2;
  padding: 0 8px;
  letter-spacing: .2px;
  height: 26px;
  font-weight: 400;
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
  border: 1px solid #ccc;
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
.btn.big {
  font-size: 18px;
  height: auto;
  padding: 0px 12px;
}
a.link {
  color: blue;
  text-decoration: underline;
}
.right {
  float: right;
}
.icon-wrapper {
  vertical-align: top;
  width: 70px;
  font-size: 50px;
  display: inline-block;
  color: #555;

  i {
    margin-top: -3px;
  }
}
.error-wrapper {
  display: inline-block;
  width: 80%;
}
div.error-page-content {
  max-width: 650px;
  margin: auto;
  transform: translateX(-20px);
  margin-top: 30vh;
  color: #777;
  font-size: 14px;
}
div.error-page-content .description {

  p {
    margin: 20px 0;
  }
}
div.error-page-content i {
  margin-right: 5px;
}
h1 {
  margin: 0;
  color: #333;
  font-weight: 400;
  font-size: 22px;
}
p.big {
  font-size: 18px;
}
.icon {
  float: right;
}
li {
  margin-bottom: 0.5em;
}
li:last-child {
  margin: 0;
}
.footer {
  font-size: 14px;
  color: #777;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 30px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
}
`

/**
 * Generate an error page HTML
 * @param {Object} e
 * @param {string} e.resource
 * @param {number} e.errorCode
 * @param {string} e.errorDescription
 * @param {string} e.errorInfo
 * @param {string} e.title
 * @param {string} e.validatedURL
 * @returns {string}
 */
export default function (e) {
  var title = 'This site can’t be reached'
  var info = ''
  var icon = 'fa-exclamation-circle'
  var button = '<a class="btn right" href="javascript:window.location.reload()">Try again</a>'
  var errorDescription
  var moreHelp = ''

  if (typeof e === 'object') {
    errorDescription = e.errorDescription || ''
    info = e.errorInfo || ''
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
        info = `<p>Your computer is not connected to the internet.</p><p>Try:</p><ul><li>Resetting your Wi-Fi connection<li>Checking your router and modem.</li></ul>`
        break
      case -105:
        icon = 'fa-frown-o'
        info = `<p>Couldn’t resolve the DNS address for <strong>${origin}</strong></p>`
        break
      case 404:
        icon = 'fa-frown-o'
        title = e.title || 'Page Not Found'
        info = `<p>${e.errorInfo}</p>`
        break
      case -501:
        title = 'Your connection is not secure'
        info = `<p>Beaker cannot establish a secure connection to the server for <strong>${origin}</strong>.</p>`
        icon = 'fa-close warning'
        button = '<a class="btn right" href="javascript:window.history.back()">Go back</a>'
        break
      case 504:
        icon = 'fa-share-alt'
        title = `Beaker is unable to access this ${e.resource} right now.`
        errorDescription = `The p2p ${e.resource} was not reachable on the network.`
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
          <div class="icon-wrapper"><i class="fa ${icon}"></i></div>

          <div class="error-wrapper">
            <h1>${title}</h1>
            <div class="description">
              ${info}
            </div>
            <div class="footer">
              ${errorDescription}
              ${button}
            </div>
          </div>
        </div>
      </body>
    </html>`.replace(/\n/g, '')
};
