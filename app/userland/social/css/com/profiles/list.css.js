import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${buttonsCSS}
${spinnerCSS}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.profile {
  display: grid;
  border-radius: 4px;
  grid-template-columns: 150px 1fr;
  align-items: center;
  grid-gap: 20px;
  border: 1px solid #ccd;
  margin-bottom: 10px;
}

.avatar {
  align-self: stretch;
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.main {
  padding: 10px;
}

.title,
.info {
  margin: 0 0 4px;
}

.title {
  font-size: 24px;
  letter-spacing: 0.65px;
}

.title a {
  color: inherit;
}

.title small {
  font-size: 14px;
  font-weight: 400;
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
