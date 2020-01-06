import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
}

beaker-status-composer {
  margin: 20px 0 30px;
}

beaker-status {
  margin-bottom: 10px;
}
`
export default cssStr
