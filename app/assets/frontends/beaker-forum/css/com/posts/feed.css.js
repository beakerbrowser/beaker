import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
  margin-bottom: 40px;
  margin-top: -10px;
}

beaker-post {
  padding: 16px 6px 10px;
  margin: 0;
  border-bottom: 1px solid #eef;
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
