import prettyBytes from 'pretty-bytes'
import { pluralize, makeSafe } from '../../../lib/strings'

const styles = `<style>
  .entry {
    background: no-repeat center left;
    padding: 3px;
    font-family: monospace;
  }
  .updog {
    padding: 3px 20px;
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKxJREFUeNpi/P//PwMlgImBQjAMDGBBF2BkZISz09LSwCE8a9YsuCBGoIMEkDEMJCUl/b90+QoYg9i41LNgc1ZycvL/hMQkhgcPH4H5iUnJIJf9nzt3LiNBL2RkZPwPj4hk4BMUYuDh44MEFDMLQ0xsHAMrKyvIJYyEwuDLiuXLeP7+/Qv3EihcmJmZGZiYmL5gqEcPFKBiAyDFjCPQ/wLVX8BrwGhSJh0ABBgAsetR5KBfw9EAAAAASUVORK5CYII=');
  }
</style>`

export default function renderDirectoryListingPage (folderKey, path, links) {
  // sort the listing
  links.sort((a, b) => a.name.localeCompare(b.name))
  // show the updog if path is not top
  var updog = ''
  if (path !== '/' && path !== '') {
    updog = `<div class="entry updog"><a href="..">..</a></div>`
  }
  // entries
  var entries = links.map(link => {
    var name = makeSafe(link.name)
    return `<div class="entry"><a href="${name}">${name}</a></div>`
  }).join('')
  // render
  return (styles + `<h1>File listing for ${makeSafe(path)}</h1>` + updog + entries)
}
