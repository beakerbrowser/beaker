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
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  font-size: 11px;
}

.field-group {
  position: relative;
  display: block;
  padding: 12px 18px;
  border: 0;
}

.field-group > div {
  margin-bottom: 5px;
}

.identity {
  font-size: 13px;
}

.verifier,
.verifier a {
  color: var(--text-color--verifier);
}

.toggle-save-contact-btn {
  position: absolute;
  top: 8px;
  right: 5px;
}
`
export default cssStr