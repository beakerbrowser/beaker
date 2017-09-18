/* globals beaker DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive, FSVirtualFolderWithTypes} from 'beaker-virtual-fs'
import renderFilesList from './files-list'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import {niceDate} from '../../lib/time'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder-color'
import renderGlobeIcon from '../icon/globe'
import renderTrashIcon from '../icon/trash-grayscale'
import renderBoxIcon from '../icon/box'
import renderPhotosIcon from '../icon/photos'
import renderVideosIcon from '../icon/videos'
import renderHomeIcon from '../icon/home'
import renderHomeGrayscaleIcon from '../icon/home-grayscale'

var userProfile

setup()
async function setup () {
  userProfile = await beaker.profiles.getCurrentProfile()
}

// exported api
// =

// - opts.filesListView: boolean (default false). If true, will use com/files-list for archives
// - opts.selectedPath: array of beaker-virtual-fs objects. The currently selected node(s)
export default function render (root, opts = {}) {
  opts.selectedPath = opts.selectedPath || []
  return rFilesColumnsView(root, opts)
}

function rFilesColumnsView (root, opts) {
  if (!root) {
    return yo`<div class="files-columns-view"></div>`
  }

  console.log(root)

  return yo`
    <div class="files-columns-view ${root.isEmpty ? 'empty' : ''}">
      ${rBreadcrumbs(root, opts.selectedPath, opts)}
      ${rColumn(root, root, 0, opts)}
      ${opts.selectedPath.map((node, i) => rColumn(root, node, i+1, opts))}
    </div>
  `
}

// rendering
// =

function redraw (root, opts = {}) {
  yo.update(document.querySelector('.files-columns-view'), rFilesColumnsView(root, opts))
}

function rIcon (node, grayscale=false) {
  let icon = ''
  if (!node) return ''
  switch (node.constructor.name) {
    case 'FSVirtualFolder_User':
      const isUserProfile = userProfile._origin === node._profile._origin
      if (isUserProfile) icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAnlJREFUeNqMU11okmEUfl5/prX1Y4xFVLAYjKg1spouGkm521SkCwdRjGL9YEXQlRdBBV0WRauL3Q1i3rQk10VMGYsMYYNBsItdWI0NnBpNnZ9++v31vq8iEw06cPjOd85zfr5zno9omgZCCFpJyA8NKuB5AzLxLjyFct6nI/LH66PX3CzOcnX4hwRHoVlOuGHpv4TgFWhiRfO5XFZUJNW1HWeod7uHEFHBK+eywL7+YQyNhcBmixQcEMMuqJ5fkNXGnvW3chnuXpsTqQ2g86QT5++GIQrrXB0PZtFlG8Knq91Q9O1oOQEtgLnpKA7anbDfCkLcWsO5p2keiz0SYfd/QEzxQpm53HoCNvb+gYuw3phAIbuBkpDF8spvqhmUCpsQcimcGptEp+0Cxj10uTUhbJMvPfRx4Az8bxfwc3WRXkUPo9EIc5ueg8SKAkmSoKkqjnSfxvjtASC5iPshjfBP+JNHpMsTGM7l16FoBGvv72BzKQ5d7boq7WexDuKw9zUYxmAPID3pjdR38GQON1/5iomtfBrssql4HM7AFPSm3byAUs4j+mwEh7w6MIxaKfKcx9uW+EMpl+giiwDdskTJU8knsTw9woPHvc+5r7rsIhiW5TRcQVXKdFSZqkLJAshCEm27qhMwm/lYDAxDsU1nVBS5qkTmYEnIwGTew2PM5kVVGfoarrmArOBo71lopB1RGtfENMw7q6RhtkR9x3oG6dkEzMjfmwswzs5/m6U72MGmhEHOoKPDVAVRm/m+xD/TTiWObSpQLBbmF2IJB9EZsdr3EC+W9HW2cHyfA/LXFcoFiWKF+QYi1X7nHqp78X9CeYsEy/0rwABJ0zkOe1qN3QAAAABJRU5ErkJggg=="/>`//renderHomeIcon()
      else icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RUFENTA4NDE1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RUFENTA4NDI1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFQUQ1MDgzRjU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFQUQ1MDg0MDU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pq2oyIAAAAHySURBVHjalFPLahRBFD1d1Y/M00li0EQRER8EjBuDoKDgajZGBD9ixpUxy7g2S81GjEt/QCQRBqI/oCEE3A0Y0NFxNJloj9NJd6eru3OrMCH2tDBeaC51H6fuPX1Ki+MYmqbhsI1OLz0Lw6i6n+NcW2jN3753uEbmpGlJAGpeODc2VLl7fRwDugFXBKi9+4gPn348b81PVZMAOhJGN1fKk+fxZrUJ2wlQyhu4cek01tZbFUpXk/UsGTB1DsvQse0JWKamfC5rIkaMNOuZQC6zG0W0Nwejg9xOhOnNqRP4QqDr+jiSN8E4Q5F8u+sSsNYfANxOrd5o0+6WZB+lnIVGywZ27Fp/AIG70ty0cWw4S+MzjAxm8IXOEO5KXwAbL6pP179tKcp0XUMQRtjobKt4XwBj04tn5Z+QxDHGFYueH2D0/uK1NIADIZ14sFQmDbw6OpgfuHDqOEZKRfx0djFEJG7av1FvfEf7l+Nyzu40n0wt/6XEkzOvH1mGMXtl4gyGiwV4QQDfF4j+jGiSLjKWga1OF2v1z3B2vLmvj289PFghiuLZ8tWLKGQzcLwAgaDxSQe61AJ9IopVvJDL4ObkuKrvERLTdTARkvr+qRmlBE789CiRM4aXb9+rB7K/WyoAcaVeJ2M9JF7Gfxr1rUq/J8AA147Pxm0xNC0AAAAASUVORK5CYII="/>`
      break
    case 'FSVirtualFolder_Network':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAzBJREFUeNpkk3toVnUYxz/nPWfvbRfbpVmb25yXaIvVjJh0swbpkhIrRCRwQaMRNSILSukC5YgC+yNoEQz8R4ICCQ2lvVPYIh2mzVxuk5ps76Z7t3dX3+u5n9PvvDaY9YMHzu93fs/n9zzf53kk/rPWftLfZdryq7YjBcP5BeiqiuJDk33W0ZmPn3xz9V3XdZFWNhWdvTtUQ44890Q3L21ZZmPZPGkjxvXkPPHlIP1Db/H7yIv4lWzLzQ+f7r0DUNkZ2WG4UqR9+8N8sLWPRTOPkbmdTCf8jCcguKaZe4v7GRxv5vjZLwkoyRzEA/g8gG5akf3NTbzWUMpU9h5upELEUn5sZZCm+xpYTLVyKdpOY00f+7a/gmmFIiuR+yoO93RtqK1lz/1rWNBT6NIllNC3VFc8y90lbcypDhvK32Akdoij53+jft1VHtj8IxWHz3XlAI5tt9VWrhUfLvFsIX/PHSDrTAkbYzJZB8ooV2OfoxpVLGfr+HnkII/WfYVjy205gCtJgdJwiFnVZkGFmQxk3QnS9jSF4e/Bgcc3vU1hcBSfrDIwcZDKUg2EnwdQwuEibqRhIumg2TbkXURjCdP7KySWhV2MvssttUaonsDns7g2u1Gcm7c1yGR0djW+wLmYQzRhMRp/SMDxap8z24WB60ewHB1DPOA4Gt+c70WRjdsAGdf4I9pCQaifyYTGfDrAXzPPi1JBZPg407e2UV50mpSWR0YPkLU8qiaCs3IEhXT8RN9gy97i8nL8ksjNtekZ7uYx9R2eqd/DqaFutlR9RnF+Ewk1REn4CicvdGIlFk78myXV6zp7Ju+q2kReIChUdXFcBd0KoJphWurb2Lr+O9ErIlzx+E+XX+bK0Ovc/GhbjWikKa+RprThXzqS0+MkM2lSui1CVVGthIAsEV18UORLzgbGmrlw+QDq8JkOz28lAm8Vle07tD+/4amv7fwSrEABpqSIjhMKiZq0PtLOr3+2Eo81Yl473bH0w6fHhE/yjmHyIMI2V7537H2lqGy3JEl+wxdEzikvG3Zy7uTskb1fiDtjnvP/pnHVqhZW6lVo1ZloJxZXwl49zv8IMAD7FG+TXRG19AAAAABJRU5ErkJggg=="/>`
      break
    case 'FSVirtualFolder_Trash':
      icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj1JREFUeNp0U9tuElEUXTMDY7glUAsMFPui1QcvUE3/oCR1isbUSADb6g/4Bl8Bb34ClfbBoomCTUzUP1DTKihVCaX0gkAbq7ENM+OeQZppgZ3s7HPO3medtS+HURQFqjAMg2QyOaco8pwkyUHB44HqU8+bjQba7fZrlmXTiUQi3b2j3etuUqnUstVqmxkadsFkMuHi2Pn/AEClWkOz2UTrZx0HB7+y8Xj8bheA7S4kSZq5ci0Al8sJm82K5ewzbG3v4Gn2OTiOg8vpxOWrfi0OOjkGUF8b8XrgcDhgNpsRDAZhsVgQnJyEhfaC4MaN8YDGSC+G41zIU65UcGnsAniexxneCN7IgzNyqheHh0dY/bSmxfUFoAJh9cN7cOR3OIZQKn1DbXsLHkGgtIbx989vFIpFojqAgSqCx4ty+QfevX0DA+XNsgy+tOoorMnwjY5ixHcO39dLGFgDp8uNVrOF+QcPEbg+Aafgg398AuLtO9jdrVMdvNC3sAdAVmSEoxG158jnX2jnr/I5yJKEe+EwZFkaDNBBATLpBW05NTWt2ZuiqKW9tJhBP2FPH0Rn72t2ZSXXYZDLqfQQicZO168PAHVgceHJSQbTHbuUyZCbGQyg9leWZWIw28uAJBKLkb/dMwd6BnvrX4vY3NgAZzBAFG9plMRQiEbZgM1qFcXCZy3uBGndb/TTJ3lkt9tDNANuhgar8xp1R1Ygtds7e/v7L+nHPqY7H/sBqMZLepaU71OvI9IGaU3fyn8CDAAq+eXPixiicQAAAABJRU5ErkJggg=="/>`
      break
    case 'FSVirtualFolder_TypeFilter':
      if (node._type === 'module') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzAxQzUzODYxMDhEMTFFMzlDM0VGMzQzQ0YwMDk4M0MiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzAxQzUzODcxMDhEMTFFMzlDM0VGMzQzQ0YwMDk4M0MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3MDFDNTM4NDEwOEQxMUUzOUMzRUYzNDNDRjAwOTgzQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3MDFDNTM4NTEwOEQxMUUzOUMzRUYzNDNDRjAwOTgzQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PlJiSs0AAAKxSURBVHjapFPdS1NhGP+9Z2c7+2jnbGcxZ5pfIS6hiEUaUhel2Acag7ySqLv+gKLEJBEvCzK6irqoiwq8CYo+0AtZH0oflBRoS10ux3S4Od1xO3Nz55zepcSMQRc98DvnPb/zPD+ej/chKLDJLk+TRnLHNChtIIqHEBXQqZ8Jqz1jWAy5ewJjhf6apoEtJFRFGRVqyiCU6GEtdwJEgxSKeFZXMh45Gu6lLgR/GVP4obMIcLV4YW1opfI5QFkH39iBMu9FwGBGMduSgZKSEH3cDc7dDvsBL4jZBm1mGJgdQC6xUlRgSwZ6KDDZHVCCPoQedgOpdWghH4h9J3RbXYsLmNUULFYTTDYePK8AyWkwYjkguMCpKF6C9+arU4qKljXoj99efY3OmUGUChI4ngMyYaSjaSwshjAisui659YMjPqJZdXnLKsN0fgx0n7Dp1WXOmC174DTKWKNspU/hrF7/Crt4Txm91ZirlqHEicPls5gJboMRdJBkmK43DFBGN7I4MxhF5rrbciP3UDhbGqF8cp7PKp1oOLoWTS5m2mtWTrmDBrrTqOtoQcG1rRRQkLO4f47GftcSRyqESBuY/A9ouBpQEROjuPJ6AD2lB/B/rpzsHAO+GffwhfugZSObTSR0LTsvAB/3Iw7vgiyWSMmFo3gLfidspU3Yyo6hsGRAaSSDPyxIfB2gQZu9D/vAxtvhZEzwmgyYVHWQ7By9JxXB33rweo5KpxBLPMVvChQzvLnUjJLgS9936Yms4lEHBYatZxjsBBbwpuPc/LPcM2t5XBaXqdlGjgDJMwgncoiHJjPBifW+rAp46CoOHj+2onttZ5+uh+ITo/3frh76QXlIxSuzgtVJ3fVm/s1oiDoT/Y+uB5+Sfk5ukxLhcshUlRtnoMU8X/9y28jyT/+x34JMAAZ1QG5SNJwgAAAAABJRU5ErkJggg=="/>`
      else if (node._type === 'document') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAZlJREFUeNqEU01PwkAQnf0oJhoBE+Qn4MELFzwQ4w/AC1EPJo2J4SL/S9EQrdDwXzxLIglViAmfQWnXmS1tCkJ5yXQ33d03783OMrvV+p67blp5HihAKPwyBhyDMfZ2US4fQxysRkNtguM4Ctef4s5zpXReeG+3wyDc12qQzWbhtFi8fm02HzYRSBVMpEGSISA8yuU0yY1pAlo0UYlJa8y3ZqG1K73x2bK03G7XUU73U4+DwXDJymO9vtEaD6QIKUAYAqQhYfYzg69eT4dfVwUfnc46ay8hgZQShBA6aB4ERCxGrREJEl+GO6SQsbdlINloNIaTQkEHwUNl4SnKvBG40VhYm/am+tdhJqP/S2oaQiJh+E0UxWLNr5HUjeZhwy1dI+d8uwIk0haRQfHlJBJzDLCaSfITVUCVd11XjwepNFAizinJCgE2xNldtZr/nc9dXRg81e/3x7eVin1eKsFkMoFUMoUKiYCFb2XV4h7GbiR2UJXaBgv3BLcw/m+bDRu2vU9FU2uKS68VbQ1ZzNXnqbYQD/dPgAEAN1IZWgxLDVUAAAAASUVORK5CYII="/>`
      else if (node._type === 'photo') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAfFJREFUeNqcUr9rFEEYfbMzu3uXO8MJ0SaFAUVBIUIEW0shkFJsbKyDnUhAUDAJKGJlZSciKfIHhJQKtnbaCIEkiJrzR8Ll4t7e7sz4ZndH9qIg5oOPndlv3vve92bEtUfru8NMd3ILwCVDoLY5HAKQIkAUyr3VO1ePq5TglbuzSEwJUcyQGfwF6ykVi9eX1zrFOiewxUXr7Tmyh+hiBo/xoiARYhRtmU7p8mV+jSnJfgvtu7YGO/E02k2qIDhM3yPuv0TavoE8vgBLzNCMylG+yXd9EV/CS1gfv42245IsbsxyMYbG3gr0+S2YnFs9OpYStqR6PrladHXjSM6Ybi4gycc4R6PoJrcWEJ96WJhYj8BraXPVYjbZuUEn+5+eYZBZ0GQMqHuf+4j/I/kHQRmxLNMdiPh3fGoJSdJDMjxAahT3i0UtVodG8JpcV2eIqNyfPDuPE2fm0X0wgZP3NgpS54GsP4jq2ovofbuFMGhSkiiLdFFEDegPEmlvkWMMYEyGzCTA1NOaguqyd7tvEMpjCERtSOfm/Wn8+PwK0AbGamR6vxJQKaguAd2dr1DyYJTAK63OOIJc/yyfgX8Htqo+ufkR/xMeFygpcJTwOIVh//Xc0toVzbdt7b+BbnQZBDRcb/sJTzM7RxCRWmvf/RJgAF2srVMBC0JAAAAAAElFTkSuQmCC"/>`
      else if (node._type === 'video') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAltJREFUeNqUUktPE1EU/mZamCC20qG2lC3TYILduDAxsbayIE1JQTTEDd2IQEPcSPwbVYPg1gV1ZUSmpSmauGhMIIG01ISu6OADtj4WQknb6fXcoYwlsTGe5OSe795zvvO6AkhGRm5F6vV6krQgCIIqimIylVLz+IcwxiBwY3z87nI0Gh2LRIaxu1vC7OwDeL0K7HZ7rlgsrpJjMp1O5VsShMPDzO/3Q6eLD9kspqancef2GD59/oK5h3NQFAUutwt72l7u4OBg1WKxpFT1Tc4kIId7Npv9miRJ1y0W66U+yu7tU7CWWcPk/UlMRCdQ0kp4+vgJeno88PT20lsGKyvLgtCo5jypnfQC6TmXy3XR4/Hc6OjoDFA2n+JVbFpJQygUouqmUC6XEZuJbWUy6atCi/m0kXY1CDm5pb+//0pnp80nSe2DDlke+PH926P19fW4dXR0bKVarY4a/VBBtAlDKbOJ+Zsoctxgt7ZhY2PjhQGGhkKMSzK5yhKJl+zw8OgEq2exqqbY0lLCsEOhMDvdglipVAyiLkcXFhaeYyYWw6/DI8hOGYuLf7BDdmB+/hkKhY+o1WpmryIva3NzC4yMm4NB7H/dRzwehyCKCDZhkVoKBAPQNI3nNgmsoE0Wd3bw6vUy2iUJcrcT29sF5PPb1Ldo4lwuT/Ng8F0eME6TgLE6KjUdbrfbCBAEoeW35QMtH1fo1M8S0BYgy3LL4GYS7stjTAJdJ0CZu53Ok5tWJKxRNvkaMacExJh9/+5toK7rTaP5u3BqPkwe03zX1/h1/yM/STXe0m8BBgAFNCj06D642QAAAABJRU5ErkJggg=="/>`
      else if (node._type === 'music') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAcxJREFUeNqEk98rBFEUx793xlgbL6z8yAt58KAkRZInEU/Im/I/eBdvHvwTkigPSHnclpIoyY+0Yu3m11rye+3s7uyOmTvOrLGGmDn1rXPn3nM+555zhxmGAcYY3KxrbL6Yzg6Q2r2F0pCqGzWByWFW8F9A9/hCB+e8j+tam9dT1FtWWYXyimr4SIK3BOsr87lz/yYwON9qbutEqa8cGiQkUhnEk2ncXD5C026pasE5AcDwmBEROb2Grip4V7MUmCE/C6apkATROYFAhOjFCbiaBtM1gOsQDQ6myNtK4mlXqq4fda6ACOLbfUyTXzaV+EPwLDC3Id9fKbTzRpJ7JhZdEpCtTY30WQEpUpzEf59x7AFZ0GXfNYE10qU6zvUwTSbXOSYIL/R84HoF20jPG5pa4Kupza2fY5dlZ0cH3wm6x5eJwImgWwQxT/iq5vWd4S4Uya2KPNLPK3wSmn8RDr/DGfhTNCLo1uyTNNKv5y/YCUEimDJ9ew/CgblBlk7xAjkBU6Yf8s/05yugbEQ4JwIsAvJP1bSrnVU/qdWW1bzgcb6CcGCWCEkiJGHK9EP+6X5bE7KkfdKepX3rG5j1O3vIb/yDkHWcDsV+CDAAcqLlh9yZRoEAAAAASUVORK5CYII="/>`
      else if (node._type === 'website') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2NJREFUeNpsk1toXFUUhr9zmSRTO5NOmyaloaRJA+kkCGqiTSNttbSp0gh9MiDiNSCmYPWhmAeh0sbaqiA+pEEoFvIiopSCEolpJBprG3Mx0eg0SWnsZZrMnLllZjJzzpybu8aHCC74WWwW69//Wv/eUtX7g9wPxwXbkRtNSz1jOfIB15WQJfkfKLJz2aOYXbJsTUiSw9pQV5tdTIseT3Gu87XDn3C43oOk/kV4WSGizzB1Y9eBwdGu8axedk5VCkfXkqiiF8t2etSSBzo/fraJp6vy/JFoYU6rJKpDpDBAcPtTVGx6lb5v+zpz+VLWksiO6zQqqqfz1JFm6jcEuFuIEjMSrJBix9b97Cg/xfDsBUo8yxw90oai2p2OqzSCtEpgm+ZHDbU17N6ikrJiJAsOPv8bbKtoJm3PY7gz6OY2Ph2xSOX9HGo6jm0qH97f0SqBJD8RrNxMOAv3smVi7j2sOLdYtsKE00HRvFGM6KNIzfD5xAjBqjEcyfOkKxQ4AmpJsZeMrXIv55AoyKz3TeKygBifzaWDKCL7i2dwpWqS+a0kDUUQgCEqLsIly4JNgc/4PQ43MxA24ljFoJQIFMHU4kuEtOfQXZuca9E3fZ68WOA77jBd1jCqbbtUbrzEleguaid/w9LyTBqnMQsu66sm+anmNIadpXXxG2pXFrAl4bx8i7SrTLiS1KhKZuaXC9+ffezg0iR768ppffNFliIxHOHS6NVrJGZex+urobVhPwfbOsikM6zkcvx89dojY+PjM2ph9sqZsK/sYiBzg0Ntr3DixLuEw3epKN8iblII8BDCUX4cHeMHAS0aIZ5M8V53N79OTTWoiS8/GNiw/eEvdKnQHo9qOLbNdEM7TXMX6e3tRdPi5HWdmwsLDH03wJztPx+wtI5QKCSeuXCh/OxILvr2nuPGW8faC5aNWlTEo/OXiAqykye7yQm5ruug6waxmEZdaWmHJv5H3jBIplIoxx7007K7OZ01rBdUjyewd98+aqqrkYX8/v5+pm9HWYgtJzyFnLcuGKSl5XHqdu5kcWmJ+bk5R02bjvATes71PJPKZL/2DQ3VlKxbRy6bJZ3JaNHwn8/HYrGIt7nlq9t37tRGIxGhRieRSMSvXw+9LPHfqBfwrjmbAqF/8//VZv8WYAChyKaFBqeqUAAAAABJRU5ErkJggg=="/>`
      else if (node._type === 'dataset') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAf5JREFUeNqkUz2LFEEQff01O3vril4iiIZ6mYEiiIj+AeECMRI2E82OC/0LwiGmouJP0NBEkYMzE0QwEUyMRMU7bw/cnelqX3XvLIdMIDgzPV3VPe9Vvaoeg55r++q559LG9STFNxZwzn66sv3h7N/f+j4CiXH94mQCnPhSFr6exvtnT870fdtLkCRBpMXew5fZX705QWhm+GcCk3QkuHqw8BOsNKju76SjsylcirDGwFu700vgkiFAYKtCgBj5CG5fu4STwx9w3Dv4VePxm7eXewl8a2FYQOerZQaJQ3hvvd6HZQZ3zoe85q9v4WcTcYwBEFnt3zURTxMJWtjgFwQRSWe+j9eWBKmrFryCH9zYBAafISSYyik0j16RgLq7DGQBoO4jwVKimiaTeo08lV28+/gCYoC1tVvwCj5EYKVEM7xHmoEUgmUXGjOFqcqBmdP2OV3WoJOQ4fRpjDwzkGJnAp0be7AkaGkrxPIYLiWweCrbWmZQaQ1IQFvXvFLP7T4SO8buZbvEJIkPXa1KNIJWKpdr4DsJOrduF2aQa0R7T6EZFMKhLqvP5XHlmQFlOMeAPEyJQdrRt6yJAZCG3zHEqv4RQBWW6AH3arZ4PB5neWElYO5qmI2791Ib9eyXlMTz1AUOE1V56QK3vILaGVxsFmuGGbks9gL+4/ojwABQE8JXt4MgNgAAAABJRU5ErkJggg=="/>`
      else if (node._type === 'application') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj9JREFUeNqUU01oE0EYfbO7iUk0tAZraSFeGo0XwWDxj0psTt4iQg+eLJ71LhVBRXoogqAoiAUVLx48xIs3ixKkIGmqlVYSG71YtQhNWmM2yf6M38xsTamr4Edm883sfG+/994M45yDMYaNMTs+lAvH+rMiN1e+VlNj+Rh8QtSqx6aYuXqY82ZZDpHjLyFqNb8XSyuNJ7XiM1hL8zCb7UX8IwzV8rFceHtPVjOCctF1XETjA9CDYezYlUiUJ/dy124TneWnROfkHwCu42STZ84D7TbNdIAFgPJtuSF5+hzNXdqpoXj9Qta3AxUmIVlA5T5QfQNoW9Ty67NEtgUcmQR3uT+FmsmnSg/uZiK9fYhnRoG3lxQAI4k4fd1tycH0AApXjs4Ft0b2OZZdpdIY82wcoEl3+d6pwu6REWDhBgEIPYTGXHXWtQfoOY7Vygd0HUhhduImUhfzbJ1CxTOGfkTFCCkdmAfAdYWFJg1H0QXb6EL6Rbg7mg7ForT5J62K9g21R9Km6r5DKN56DLNlLUaeTyc409Y6LthuOjk6TGIsA99fAf0Hqdg7nUK4xheaN8BtB0PXpoUTYUNnjjXmAcjDaDeA+idg206Ucu+gGUx+PRSLID6cpLxOjUjQBfGwHd6hIO+CQUr3JuhfR/3bHAYv5wfFu/d3ThQQtCQLxjR/Gwn5R+lhIaoFNBLchc3YR3El5LH+vDbFHs1khB6rLeflZoB1G/erI/g7hNzzXi4t9vJaxzF1mZjfbfyf+CXAAPkf4mqW2jyTAAAAAElFTkSuQmCC"/>`
      else if (node._type === 'user-profile') icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RUFENTA4NDE1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RUFENTA4NDI1OUJGMTFFMkEzQkFCMTAyRDM1NkMxNjIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFQUQ1MDgzRjU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFQUQ1MDg0MDU5QkYxMUUyQTNCQUIxMDJEMzU2QzE2MiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pq2oyIAAAAHySURBVHjalFPLahRBFD1d1Y/M00li0EQRER8EjBuDoKDgajZGBD9ixpUxy7g2S81GjEt/QCQRBqI/oCEE3A0Y0NFxNJloj9NJd6eru3OrMCH2tDBeaC51H6fuPX1Ki+MYmqbhsI1OLz0Lw6i6n+NcW2jN3753uEbmpGlJAGpeODc2VLl7fRwDugFXBKi9+4gPn348b81PVZMAOhJGN1fKk+fxZrUJ2wlQyhu4cek01tZbFUpXk/UsGTB1DsvQse0JWKamfC5rIkaMNOuZQC6zG0W0Nwejg9xOhOnNqRP4QqDr+jiSN8E4Q5F8u+sSsNYfANxOrd5o0+6WZB+lnIVGywZ27Fp/AIG70ty0cWw4S+MzjAxm8IXOEO5KXwAbL6pP179tKcp0XUMQRtjobKt4XwBj04tn5Z+QxDHGFYueH2D0/uK1NIADIZ14sFQmDbw6OpgfuHDqOEZKRfx0djFEJG7av1FvfEf7l+Nyzu40n0wt/6XEkzOvH1mGMXtl4gyGiwV4QQDfF4j+jGiSLjKWga1OF2v1z3B2vLmvj289PFghiuLZ8tWLKGQzcLwAgaDxSQe61AJ9IopVvJDL4ObkuKrvERLTdTARkvr+qRmlBE789CiRM4aXb9+rB7K/WyoAcaVeJ2M9JF7Gfxr1rUq/J8AA147Pxm0xNC0AAAAASUVORK5CYII="/>`
      else icon = yo`<img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAVBJREFUeNrEk7FLw0AUxr9LAk1SAkI6qyCCq4KzCiKKrZuDOPiPibgJkbqoKCJoZ0F36aB17NKgHdK75Mx3RoeqtdrBB0fuuO/35d29e0JrjVHCwojh7O7tI00zWJbgWpdKpYFAkiT8iCzTsG0LDldZltFE16rreHhsDTSYnBjH8cmpFsISNLAI96TUG7VqDj/RHEJ8PbhHDbVkyDppmkY721uQSmFmemq4g+dmZA6iw8hRSm3Gzy84O78odn+qirkrrK2ugCwzQNJL4PkelpcWc14XGtEH6jfv/O+XV9eGIWsMZE/C91woKXFze/dx3n4Dvpn5uVmjJWMMlErNxHU9dOIYlUpYGHwOGlBDLRmyJgPeZrns477Z/BZ+j3a7jTAMi9LnBpzYjoMgCMwYNsiYMna73Ua9frTw255gpvmrbDBfFn/sj63QEf/eja8CDAABPLGbX7No1AAAAABJRU5ErkJggg=="/>`
      break
    default:
      icon = node.isContainer ? yo`<img class="icon folder" src="beaker://assets/icon/folder-color.png"/>` : yo`<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUJJREFUeNqkk8FKw0AQhmcmyb0HTR7A4hPUS1B8haIetPh4Ei9tUqQn6aUPIra9hRYUTKiCzbiTJpsssdXSgWFnJjsf/85ukJnhaTR6+16vW5xlwFA3yRAIERBxcdXtuvoLcxUMooj/sjiOuR+GQR0gTnXa63SmfA7T2TxfJRd7CAJwXRfOff+uH0WPdY12KTRPbEukKhdoBUYiWCyX4HkeXPj+bTgcOqp8owElgshWjpqeZZv6absNz+MxyIzuez0BXxsKSgm2TbmC0ogYPtIEzjqd3DWY2TxC1WAZALHP1ReslEPR5B4f6bgBkBlsM2b+td5QsK8ZAMuiAwF0IECuEYB3bMctgGLyjmMZE272o7mWACqk0z+PUN+XA9IkmajneZlt3u9OBfJnpmk60SW5X/V4TlTc2mN276rvRYIfAQYABXymGHKpbU8AAAAASUVORK5CYII="/>`// renderFileOIcon()
  }
  return icon
}

function rBreadcrumbs (root, selectedPath, opts = {}) {
  return yo`<div class="breadcrumbs">${selectedPath.map((node, i) => rBreadcrumb(root, node, i, opts))}</div>`
}

function rBreadcrumb (root, node, depth, opts) {
  if (!node) return ''
  return yo`
    <div class="breadcrumb" ondblclick=${e => onClickNode(e, root, node, depth, opts)}>
      ${rIcon(node)}
      ${node.name}
    </div>
  `
}

function rColumn (root, node, depth, opts = {}) {
  if (!node) {
    return ''
  }

  if (opts.filesListView && node.type === 'archive') {
    return renderFilesList(node, opts)
  }

  if (node.isEmpty) {
    return yo`<div class="column"></div>`
  }

  return yo`
    <div class="column ${depth === 0 ? 'first' : ''}">
      ${node.children.map(childNode => rNode(root, childNode, depth, opts))}
    </div>
  `
}

function rNode (root, node, depth, opts) {
  const isHighlighted = opts.selectedPath.reduce((agg, activeNode) => agg || activeNode === node, false)
  const isSelected = isHighlighted && opts.selectedPath.length - 1 === depth
  if (node.isHidden) return ''
  return yo`
    <div
      class="item ${node.type} ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, root, node, depth, opts)}
      ondblclick=${e => onDblClickNode(e, node)}
      oncontextmenu=${e => onContextMenu(e, root, node, depth, opts)}>
      ${rIcon(node, !depth)}
      <div class="name">${node.name}</div>
      ${node.isContainer ? yo`<span class="caret right">▶</span>` : ''}
    </div>
  `
}

// helpers
// =

function scrollRight () {
  // scroll to the rightmost point
  const container = document.querySelector('.files-columns-view')
  container.scrollLeft = container.scrollWidth
}

async function unselectNode (root, opts) {
  if (opts.selectedPath.length > 0) {
    opts.selectedPath.length = opts.selectedPath.length - 1
  }
}

// event handlers
// =

async function onClickNode (e, root, node, depth, opts) {
  // update state
  opts.selectedPath.length = depth // truncate all nodes with equal or greater depth
  opts.selectedPath.push(node) // add (or readd) this node
  await node.readData()
  if (node instanceof FSVirtualFolderWithTypes) {
    // autoselect the 'all' type
    let all = node.children[0]
    opts.selectedPath.push(all)
    await all.readData()
  }

  // emit an update
  if (opts.onSelection) {
    opts.onSelection(opts.selectedPath)
  }

  // render
  redraw(root, opts)
  scrollRight()
}

async function onContextMenu (e, root, node, depth, opts) {
  if (!(node instanceof FSArchive)) {
    return // only give a custom menu for an archive
  }

  e.preventDefault()
  e.stopPropagation()

  // select first
  await onClickNode(null, root, node, depth, opts)
  // HACK wait a frame or two to let rendering occur -prf
  await new Promise(resolve => setTimeout(resolve, 75))

  // now run the menu
  const action = await beaker.browser.showContextMenu([
    {label: 'Open URL', id: 'open'},
    {label: 'Copy URL', id: 'copy-url'},
    {type: 'separator'},
    {label: `Delete "${node.name}"`, id: 'delete'},
    {type: 'separator'},
    {type: 'submenu', label: 'New...', submenu: [
      {label: 'Application', id: 'new-application'},
      {label: 'Code module', id: 'new-module'},
      {label: 'Dataset', id: 'new-dataset'},
      {label: 'Documents folder', id: 'new-document'},
      {label: 'Music folder', id: 'new-music'},
      {label: 'Photos folder', id: 'new-photo'},
      {label: 'Videos folder', id: 'new-video'},
      {label: 'Website', id: 'new-website'}
    ]}
  ])

  // now run the action
  node = node || root
  switch (action) {
    case 'open': return window.open(node.url)
    case 'copy-url': return writeToClipboard(node.url)
    case 'delete':
      if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
        await node.delete()
        node.isHidden = true // quick hack to get this archive out of the view
        await unselectNode(root, opts)
        redraw(root, opts)
      }
      return
    case null: return
    default:
      if (action && action.startsWith('new')) {
        let archive = await DatArchive.create({prompt: true, type: action.slice('new-'.length)})
        window.location.pathname = archive.url.slice('dat://'.length)
      }
      return
  }
}

function onDblClickNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  // open in a new window
  if (node.url) {
    window.open(node.url)
  }
}
