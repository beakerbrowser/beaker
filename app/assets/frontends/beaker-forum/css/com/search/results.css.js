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

a {
  text-decoration: none;
  color: #667;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}

.result {
  padding: 10px 20px;
  font-size: 15px;
  line-height: 1.4;
}

.result h4 {
  margin: 0;
  font-size: 21px;
  font-weight: normal;
}

.result h4 small {
  font-size: 14px;
  font-weight: 400;
}

.result h4 small a {
  color: #889;
}

.result .title {
  color: var(--color-link);
}

.result .author {
  color: green;
}

beaker-paginator {
  margin: 20px 10px;
  padding-top: 20px;
  border-top: 1px solid #dde;
}
`
export default cssStr
