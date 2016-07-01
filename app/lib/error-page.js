export default function (err) {
  return `<body style="font-family: sans-serif;color: #666;">
    <div style="max-width: 410px;padding: 0px 35px 16px;border: 1px solid #ccc;background: #fdfdfd;">
      <h1 style="color: #555">This site can't be reached</h1>
      <h2>${err}</h2>
      <a href="javascript:window.location.reload()" style="display: inline-block;background: #4b92ea;color:#fff;border-radius:2px;text-decoration: none;padding: 6px 17px;border: 1px solid #428ae4;">Retry</a>
    </div>
  </body>`.replace(/\n/g,'')
}