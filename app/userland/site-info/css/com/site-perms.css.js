import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import formCSS from '../form.css.js'

const cssStr = css`
${formCSS}
${buttonsCSS}

p {
  margin: 5px 0;
}

a {
  cursor: pointer;
  color: var(--text-color--link);
  text-decoration: underline;
}

.field-group {
  display: block;
  padding: 12px 18px;
  border: 0;
}

.field-group > div {
  margin-bottom: 5px;
}
`
export default cssStr