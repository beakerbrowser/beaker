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

.field-group:empty {
  display: none;
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

.field-group + .subscribers {
  border-top: 1px solid var(--border-color--default);
}

.subscribers h4 {
  font-weight: normal;
  font-size: 11px;
  padding: 7px 18px;
  margin: 0;
  background: var(--bg-color--light);
}

.subscribers > div {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  max-height: 150px;
  overflow: auto;
  padding: 6px 8px;
}

.subscriber {
  display: inline-flex;
  align-items: center;
  padding: 6px 8px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
}

.subscriber:hover {
  text-decoration: none;
  background: var(--bg-color--light);
}

.subscriber .thumb {
  display: block;
  width: 18px;
  height: 18px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 7px;
}

.subscriber .title {
  font-size: 12px;
  color: initial;
  letter-spacing: 0.3px;
}
`
export default cssStr