export default function (err) {
  return `
    <body>
    <link rel="stylesheet" href="beaker://assets/font-awesome.css">
    <link rel="stylesheet" href="beaker://assets/error-page.css">

      <div class="error-page-content">
        <h1>This site can’t be reached</h1>
        <p>
          Beaker couldn’t establish a connection to this site.
        </p>

        <p class="error">
          <i class="fa fa-exclamation-triangle"></i>
          ${err}
        </p>

        <a class="btn primary" href="javascript:window.location.reload()">Try again</a>
      </div>
    </body>`.replace(/\n/g,'')
}
