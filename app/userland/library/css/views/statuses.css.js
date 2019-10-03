import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import viewHeaderCSS from '../view-header.css.js'
import emptyCSS from '../empty.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${viewHeaderCSS}
${emptyCSS}

:host {
  display: block;
  margin: 0px 10px 50px 190px;
}

@media (min-width: 1300px) {
  beaker-status-feed {
    padding-right: 180px;
  }
}

beaker-status-feed {
  width: 540px;
  margin: 15px auto 50px;
}
`
export default cssStr