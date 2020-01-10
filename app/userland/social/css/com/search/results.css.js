import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
  padding-right: 10px;
}

beaker-post {
  border-top: 1px solid #dde;
  padding: 16px 10px;
  margin: 0;
}
`
export default cssStr
