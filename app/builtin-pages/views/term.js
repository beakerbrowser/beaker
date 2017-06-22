console.log('hello')

var target
{
  let url = window.location.pathname.slice(2)
  let host = url.slice(0, url.indexOf('/'))
  let pathname = url.slice(url.indexOf('/'))
  target = {url, host, pathname}
}

console.log(target)
document.title = `${target.host || target.url} | Terminal`