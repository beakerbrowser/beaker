import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
  margin-bottom: 40px;
}

beaker-post {
  padding: 10px 6px;
  margin: 0;
}

beaker-paginator {
  font-size: 16px;
  margin: 20px 10px;
}

.error {
  padding: 30px;
  color: red;
  background: #fff7f7;
  letter-spacing: 0.5px;
  font-size: 16px;
}
`
export default cssStr
