import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${buttonsCSS}
${spinnerCSS}

:host {
  display: grid;
  border-radius: 4px;
  grid-template-columns: 150px 1fr;
  align-items: center;
  grid-gap: 20px;
  border: 1px solid #ccd;
  overflow: hidden;
}

a {
  color: var(--color-link);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  display: block;
  margin: 0 auto;
  width: 150px;
  height: 150px;
  object-fit: cover;
}

.title,
.info {
  margin: 0 0 4px;
}

.title {
  font-size: 31px;
  letter-spacing: 0.65px;
}

.title a {
  color: inherit;
}

.info {
  font-size: 15px;
  letter-spacing: 0.35px;
}

.ctrls {
  margin: 10px 0 0;
}

.info .fa-fw {
  font-size: 11px;
  color: #778;
}

button {
  font-size: 14px;
  padding: 6px 12px;
}

button .fa-fw {
  font-size: 13px;
  margin-right: 2px;
}

`
export default cssStr
