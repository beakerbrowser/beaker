import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${buttonsCSS}
${spinnerCSS}

:host {
  display: block;
  position: relative;
  background: #fff;
  border: 1px solid #ccd;
  border-radius: 8px;
  box-sizing: border-box;
  padding: 14px 12px 16px 12px;
  margin: 0px 0 10px;
  max-width: 360px;
}

:host(.dark) {
  background: #f9f9fc;
  border: 0;
}

a {
  color: #889;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  position: absolute;
  left: 12px;
  top: 12px;

  display: block;
  margin: 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  padding: 4px 8px !important;
  background: transparent !important;
  border: 1px solid var(--blue) !important;
  color: var(--blue) !important;
}

button:hover {
  background: #eef !important;
}

.title,
.id {
  margin: 0 0 0 46px;
}

.title {
  font-size: 14px;
}

.title a {
  color: inherit;
}

.id,
.description {
  font-size: 13px;
}

.stats {
  font-size: 12px;
  margin-bottom: 0;
}

.stats a + a {
  margin-left: 6px;
}

.stats a strong {
  color: #334;
}

`
export default cssStr
