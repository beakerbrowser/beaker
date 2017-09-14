import * as yo from 'yo-yo'
import {STANDARD_ARCHIVE_TYPES} from '../../lib/const'
import renderFolderIcon from '../icon/folder-color'
import renderFileOIcon from '../icon/file-o'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import renderFilePreview from './file-preview'

// exported api
// =

export default function render (node) {
  const isEditingInfo = false // TODO
  const isArchive = node.constructor.name === 'FSArchive'
  const archiveInfo = node._archiveInfo
  const networked = archiveInfo.userSettings.networked

  if (!archiveInfo) return yo`<div></div>`

  // render preview
  let preview
  if (node.type === 'file') {
    preview = renderFilePreview(node)
    if (!preview) {
      preview = yo`<div class="icon-wrapper">${renderFileOIcon()}</div>`
    }
  }

  return yo`
    <div class="files-list-sidebar">
      <div class="archive-info">
        <div class="header">
          <span title="${networked ? 'Stop' : 'Start'} hosting this archive" class="archive-icon ${networked ? 'networked' : ''}">
            ${rIcon(node)}
          </span>
          <h1>${archiveInfo.title || 'Untitled'}</h1>
        </div>

        <div class="main">
          <p class="desc">${archiveInfo.description || yo`<em>No description</em>`}</p>
        </div>
      </div>
      ${preview ? yo`
        <div class="preview">
          ${preview}
        </div>
      ` : ''}
      <div class="metadata">
        ${!isArchive ? yo`<div class="name">${node.name}</div>` : ''}
        <table>
          ${node.size ? yo`<tr><td class="label">Size</td><td>${prettyBytes(node.size)}</td></tr>` : ''}
          ${node.mtime ? yo`<tr><td class="label">Updated</td><td>${niceDate(+(node.mtime || 0))}</td></tr>` : ''}
          <tr><td class="label">Editable</td><td>${node.isEditable ? 'Yes' : 'No'}</td></tr>
        </table>
      </div>
    </div>
  `
}

function rIcon (node) {
  const type = findStandardType(node._archiveInfo.type)
  let icon = ''
  switch (type) {
    case 'application':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj9JREFUeNqUU01oE0EYfbO7iUk0tAZraSFeGo0XwWDxj0psTt4iQg+eLJ71LhVBRXoogqAoiAUVLx48xIs3ixKkIGmqlVYSG71YtQhNWmM2yf6M38xsTamr4Edm883sfG+/994M45yDMYaNMTs+lAvH+rMiN1e+VlNj+Rh8QtSqx6aYuXqY82ZZDpHjLyFqNb8XSyuNJ7XiM1hL8zCb7UX8IwzV8rFceHtPVjOCctF1XETjA9CDYezYlUiUJ/dy124TneWnROfkHwCu42STZ84D7TbNdIAFgPJtuSF5+hzNXdqpoXj9Qta3AxUmIVlA5T5QfQNoW9Ty67NEtgUcmQR3uT+FmsmnSg/uZiK9fYhnRoG3lxQAI4k4fd1tycH0AApXjs4Ft0b2OZZdpdIY82wcoEl3+d6pwu6REWDhBgEIPYTGXHXWtQfoOY7Vygd0HUhhduImUhfzbJ1CxTOGfkTFCCkdmAfAdYWFJg1H0QXb6EL6Rbg7mg7ForT5J62K9g21R9Km6r5DKN56DLNlLUaeTyc409Y6LthuOjk6TGIsA99fAf0Hqdg7nUK4xheaN8BtB0PXpoUTYUNnjjXmAcjDaDeA+idg206Ucu+gGUx+PRSLID6cpLxOjUjQBfGwHd6hIO+CQUr3JuhfR/3bHAYv5wfFu/d3ThQQtCQLxjR/Gwn5R+lhIaoFNBLchc3YR3El5LH+vDbFHs1khB6rLeflZoB1G/erI/g7hNzzXi4t9vJaxzF1mZjfbfyf+CXAAPkf4mqW2jyTAAAAAElFTkSuQmCC"/>`
      break
    case 'module':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzAxQzUzODYxMDhEMTFFMzlDM0VGMzQzQ0YwMDk4M0MiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzAxQzUzODcxMDhEMTFFMzlDM0VGMzQzQ0YwMDk4M0MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3MDFDNTM4NDEwOEQxMUUzOUMzRUYzNDNDRjAwOTgzQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3MDFDNTM4NTEwOEQxMUUzOUMzRUYzNDNDRjAwOTgzQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlJiSs0AAAKxSURBVHjapFPdS1NhGP+9Z2c7+2jnbGcxZ5pfIS6hiEUaUhel2Acag7ySqLv+gKLEJBEvCzK6irqoiwq8CYo+0AtZH0oflBRoS10ux3S4Od1xO3Nz55zepcSMQRc98DvnPb/zPD+ej/chKLDJLk+TRnLHNChtIIqHEBXQqZ8Jqz1jWAy5ewJjhf6apoEtJFRFGRVqyiCU6GEtdwJEgxSKeFZXMh45Gu6lLgR/GVP4obMIcLV4YW1opfI5QFkH39iBMu9FwGBGMduSgZKSEH3cDc7dDvsBL4jZBm1mGJgdQC6xUlRgSwZ6KDDZHVCCPoQedgOpdWghH4h9J3RbXYsLmNUULFYTTDYePK8AyWkwYjkguMCpKF6C9+arU4qKljXoj99efY3OmUGUChI4ngMyYaSjaSwshjAisui659YMjPqJZdXnLKsN0fgx0n7Dp1WXOmC174DTKWKNspU/hrF7/Crt4Txm91ZirlqHEicPls5gJboMRdJBkmK43DFBGN7I4MxhF5rrbciP3UDhbGqF8cp7PKp1oOLoWTS5m2mtWTrmDBrrTqOtoQcG1rRRQkLO4f47GftcSRyqESBuY/A9ouBpQEROjuPJ6AD2lB/B/rpzsHAO+GffwhfugZSObTSR0LTsvAB/3Iw7vgiyWSMmFo3gLfidspU3Yyo6hsGRAaSSDPyxIfB2gQZu9D/vAxtvhZEzwmgyYVHWQ7By9JxXB33rweo5KpxBLPMVvChQzvLnUjJLgS9936Yms4lEHBYatZxjsBBbwpuPc/LPcM2t5XBaXqdlGjgDJMwgncoiHJjPBifW+rAp46CoOHj+2onttZ5+uh+ITo/3frh76QXlIxSuzgtVJ3fVm/s1oiDoT/Y+uB5+Sfk5ukxLhcshUlRtnoMU8X/9y28jyT/+x34JMAAZ1QG5SNJwgAAAAABJRU5ErkJggg=="/>`
      break
    case 'dataset':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAf5JREFUeNqkUz2LFEEQff01O3vril4iiIZ6mYEiiIj+AeECMRI2E82OC/0LwiGmouJP0NBEkYMzE0QwEUyMRMU7bw/cnelqX3XvLIdMIDgzPV3VPe9Vvaoeg55r++q559LG9STFNxZwzn66sv3h7N/f+j4CiXH94mQCnPhSFr6exvtnT870fdtLkCRBpMXew5fZX705QWhm+GcCk3QkuHqw8BOsNKju76SjsylcirDGwFu700vgkiFAYKtCgBj5CG5fu4STwx9w3Dv4VePxm7eXewl8a2FYQOerZQaJQ3hvvd6HZQZ3zoe85q9v4WcTcYwBEFnt3zURTxMJWtjgFwQRSWe+j9eWBKmrFryCH9zYBAafISSYyik0j16RgLq7DGQBoO4jwVKimiaTeo08lV28+/gCYoC1tVvwCj5EYKVEM7xHmoEUgmUXGjOFqcqBmdP2OV3WoJOQ4fRpjDwzkGJnAp0be7AkaGkrxPIYLiWweCrbWmZQaQ1IQFvXvFLP7T4SO8buZbvEJIkPXa1KNIJWKpdr4DsJOrduF2aQa0R7T6EZFMKhLqvP5XHlmQFlOMeAPEyJQdrRt6yJAZCG3zHEqv4RQBWW6AH3arZ4PB5neWElYO5qmI2791Ib9eyXlMTz1AUOE1V56QK3vILaGVxsFmuGGbks9gL+4/ojwABQE8JXt4MgNgAAAABJRU5ErkJggg=="/>`
      break
    case 'document':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAZlJREFUeNqEU01PwkAQnf0oJhoBE+Qn4MELFzwQ4w/AC1EPJo2J4SL/S9EQrdDwXzxLIglViAmfQWnXmS1tCkJ5yXQ33d03783OMrvV+p67blp5HihAKPwyBhyDMfZ2US4fQxysRkNtguM4Ctef4s5zpXReeG+3wyDc12qQzWbhtFi8fm02HzYRSBVMpEGSISA8yuU0yY1pAlo0UYlJa8y3ZqG1K73x2bK03G7XUU73U4+DwXDJymO9vtEaD6QIKUAYAqQhYfYzg69eT4dfVwUfnc46ay8hgZQShBA6aB4ERCxGrREJEl+GO6SQsbdlINloNIaTQkEHwUNl4SnKvBG40VhYm/am+tdhJqP/S2oaQiJh+E0UxWLNr5HUjeZhwy1dI+d8uwIk0haRQfHlJBJzDLCaSfITVUCVd11XjwepNFAizinJCgE2xNldtZr/nc9dXRg81e/3x7eVin1eKsFkMoFUMoUKiYCFb2XV4h7GbiR2UJXaBgv3BLcw/m+bDRu2vU9FU2uKS68VbQ1ZzNXnqbYQD/dPgAEAN1IZWgxLDVUAAAAASUVORK5CYII="/>`
      break
    case 'music':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAcxJREFUeNqEk98rBFEUx793xlgbL6z8yAt58KAkRZInEU/Im/I/eBdvHvwTkigPSHnclpIoyY+0Yu3m11rye+3s7uyOmTvOrLGGmDn1rXPn3nM+555zhxmGAcYY3KxrbL6Yzg6Q2r2F0pCqGzWByWFW8F9A9/hCB+e8j+tam9dT1FtWWYXyimr4SIK3BOsr87lz/yYwON9qbutEqa8cGiQkUhnEk2ncXD5C026pasE5AcDwmBEROb2Grip4V7MUmCE/C6apkATROYFAhOjFCbiaBtM1gOsQDQ6myNtK4mlXqq4fda6ACOLbfUyTXzaV+EPwLDC3Id9fKbTzRpJ7JhZdEpCtTY30WQEpUpzEf59x7AFZ0GXfNYE10qU6zvUwTSbXOSYIL/R84HoF20jPG5pa4Kupza2fY5dlZ0cH3wm6x5eJwImgWwQxT/iq5vWd4S4Uya2KPNLPK3wSmn8RDr/DGfhTNCLo1uyTNNKv5y/YCUEimDJ9ew/CgblBlk7xAjkBU6Yf8s/05yugbEQ4JwIsAvJP1bSrnVU/qdWW1bzgcb6CcGCWCEkiJGHK9EP+6X5bE7KkfdKepX3rG5j1O3vIb/yDkHWcDsV+CDAAcqLlh9yZRoEAAAAASUVORK5CYII="/>`
      break
    case 'photo':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfFJREFUeNqcUr9rFEEYfbMzu3uXO8MJ0SaFAUVBIUIEW0shkFJsbKyDnUhAUDAJKGJlZSciKfIHhJQKtnbaCIEkiJrzR8Ll4t7e7sz4ZndH9qIg5oOPndlv3vve92bEtUfru8NMd3ILwCVDoLY5HAKQIkAUyr3VO1ePq5TglbuzSEwJUcyQGfwF6ykVi9eX1zrFOiewxUXr7Tmyh+hiBo/xoiARYhRtmU7p8mV+jSnJfgvtu7YGO/E02k2qIDhM3yPuv0TavoE8vgBLzNCMylG+yXd9EV/CS1gfv42245IsbsxyMYbG3gr0+S2YnFs9OpYStqR6PrladHXjSM6Ybi4gycc4R6PoJrcWEJ96WJhYj8BraXPVYjbZuUEn+5+eYZBZ0GQMqHuf+4j/I/kHQRmxLNMdiPh3fGoJSdJDMjxAahT3i0UtVodG8JpcV2eIqNyfPDuPE2fm0X0wgZP3NgpS54GsP4jq2ovofbuFMGhSkiiLdFFEDegPEmlvkWMMYEyGzCTA1NOaguqyd7tvEMpjCERtSOfm/Wn8+PwK0AbGamR6vxJQKaguAd2dr1DyYJTAK63OOIJc/yyfgX8Htqo+ufkR/xMeFygpcJTwOIVh//Xc0toVzbdt7b+BbnQZBDRcb/sJTzM7RxCRWmvf/RJgAF2srVMBC0JAAAAAAElFTkSuQmCC"/>`
      break
    case 'video':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAltJREFUeNqUUktPE1EU/mZamCC20qG2lC3TYILduDAxsbayIE1JQTTEDd2IQEPcSPwbVYPg1gV1ZUSmpSmauGhMIIG01ISu6OADtj4WQknb6fXcoYwlsTGe5OSe795zvvO6AkhGRm5F6vV6krQgCIIqimIylVLz+IcwxiBwY3z87nI0Gh2LRIaxu1vC7OwDeL0K7HZ7rlgsrpJjMp1O5VsShMPDzO/3Q6eLD9kspqancef2GD59/oK5h3NQFAUutwt72l7u4OBg1WKxpFT1Tc4kIId7Npv9miRJ1y0W66U+yu7tU7CWWcPk/UlMRCdQ0kp4+vgJeno88PT20lsGKyvLgtCo5jypnfQC6TmXy3XR4/Hc6OjoDFA2n+JVbFpJQygUouqmUC6XEZuJbWUy6atCi/m0kXY1CDm5pb+//0pnp80nSe2DDlke+PH926P19fW4dXR0bKVarY4a/VBBtAlDKbOJ+Zsoctxgt7ZhY2PjhQGGhkKMSzK5yhKJl+zw8OgEq2exqqbY0lLCsEOhMDvdglipVAyiLkcXFhaeYyYWw6/DI8hOGYuLf7BDdmB+/hkKhY+o1WpmryIva3NzC4yMm4NB7H/dRzwehyCKCDZhkVoKBAPQNI3nNgmsoE0Wd3bw6vUy2iUJcrcT29sF5PPb1Ldo4lwuT/Ng8F0eME6TgLE6KjUdbrfbCBAEoeW35QMtH1fo1M8S0BYgy3LL4GYS7stjTAJdJ0CZu53Ok5tWJKxRNvkaMacExJh9/+5toK7rTaP5u3BqPkwe03zX1/h1/yM/STXe0m8BBgAFNCj06D642QAAAABJRU5ErkJggg=="/>`
      break
    case 'user-profile':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RUFENTA4NDE1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RUFENTA4NDI1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFQUQ1MDgzRjU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFQUQ1MDg0MDU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pq2oyIAAAAHySURBVHjalFPLahRBFD1d1Y/M00li0EQRER8EjBuDoKDgajZGBD9ixpUxy7g2S81GjEt/QCQRBqI/oCEE3A0Y0NFxNJloj9NJd6eru3OrMCH2tDBeaC51H6fuPX1Ki+MYmqbhsI1OLz0Lw6i6n+NcW2jN3753uEbmpGlJAGpeODc2VLl7fRwDugFXBKi9+4gPn348b81PVZMAOhJGN1fKk+fxZrUJ2wlQyhu4cek01tZbFUpXk/UsGTB1DsvQse0JWKamfC5rIkaMNOuZQC6zG0W0Nwejg9xOhOnNqRP4QqDr+jiSN8E4Q5F8u+sSsNYfANxOrd5o0+6WZB+lnIVGywZ27Fp/AIG70ty0cWw4S+MzjAxm8IXOEO5KXwAbL6pP179tKcp0XUMQRtjobKt4XwBj04tn5Z+QxDHGFYueH2D0/uK1NIADIZ14sFQmDbw6OpgfuHDqOEZKRfx0djFEJG7av1FvfEf7l+Nyzu40n0wt/6XEkzOvH1mGMXtl4gyGiwV4QQDfF4j+jGiSLjKWga1OF2v1z3B2vLmvj289PFghiuLZ8tWLKGQzcLwAgaDxSQe61AJ9IopVvJDL4ObkuKrvERLTdTARkvr+qRmlBE789CiRM4aXb9+rB7K/WyoAcaVeJ2M9JF7Gfxr1rUq/J8AA147Pxm0xNC0AAAAASUVORK5CYII="/>`
      break
    case 'website':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2NJREFUeNpsk1toXFUUhr9zmSRTO5NOmyaloaRJA+kkCGqiTSNttbSp0gh9MiDiNSCmYPWhmAeh0sbaqiA+pEEoFvIiopSCEolpJBprG3Mx0eg0SWnsZZrMnLllZjJzzpybu8aHCC74WWwW69//Wv/eUtX7g9wPxwXbkRtNSz1jOfIB15WQJfkfKLJz2aOYXbJsTUiSw9pQV5tdTIseT3Gu87XDn3C43oOk/kV4WSGizzB1Y9eBwdGu8axedk5VCkfXkqiiF8t2etSSBzo/fraJp6vy/JFoYU6rJKpDpDBAcPtTVGx6lb5v+zpz+VLWksiO6zQqqqfz1JFm6jcEuFuIEjMSrJBix9b97Cg/xfDsBUo8yxw90oai2p2OqzSCtEpgm+ZHDbU17N6ikrJiJAsOPv8bbKtoJm3PY7gz6OY2Ph2xSOX9HGo6jm0qH97f0SqBJD8RrNxMOAv3smVi7j2sOLdYtsKE00HRvFGM6KNIzfD5xAjBqjEcyfOkKxQ4AmpJsZeMrXIv55AoyKz3TeKygBifzaWDKCL7i2dwpWqS+a0kDUUQgCEqLsIly4JNgc/4PQ43MxA24ljFoJQIFMHU4kuEtOfQXZuca9E3fZ68WOA77jBd1jCqbbtUbrzEleguaid/w9LyTBqnMQsu66sm+anmNIadpXXxG2pXFrAl4bx8i7SrTLiS1KhKZuaXC9+ffezg0iR768ppffNFliIxHOHS6NVrJGZex+urobVhPwfbOsikM6zkcvx89dojY+PjM2ph9sqZsK/sYiBzg0Ntr3DixLuEw3epKN8iblII8BDCUX4cHeMHAS0aIZ5M8V53N79OTTWoiS8/GNiw/eEvdKnQHo9qOLbNdEM7TXMX6e3tRdPi5HWdmwsLDH03wJztPx+wtI5QKCSeuXCh/OxILvr2nuPGW8faC5aNWlTEo/OXiAqykye7yQm5ruug6waxmEZdaWmHJv5H3jBIplIoxx7007K7OZ01rBdUjyewd98+aqqrkYX8/v5+pm9HWYgtJzyFnLcuGKSl5XHqdu5kcWmJ+bk5R02bjvATes71PJPKZL/2DQ3VlKxbRy6bJZ3JaNHwn8/HYrGIt7nlq9t37tRGIxGhRieRSMSvXw+9LPHfqBfwrjmbAqF/8//VZv8WYAChyKaFBqeqUAAAAABJRU5ErkJggg=="/>`
      break
    default:
      icon = renderFolderIcon()
  }
  return icon
}

// event handlers
// =

function onClickEdit () {
  // TODO
}

function onSaveSettings () {
  // TODO
}

// helpers
// =
function findStandardType (type) {
  if (!type || !type.length) return false
  type = type.filter(f => STANDARD_ARCHIVE_TYPES.includes(f))
  return type[0]
}