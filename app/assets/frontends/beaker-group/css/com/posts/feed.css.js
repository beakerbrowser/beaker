import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
}

beaker-post {
  padding: 8px 6px;
  margin: 0;
}
`
export default cssStr
