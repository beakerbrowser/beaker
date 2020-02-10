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
  grid-template-columns: 80px 1fr;
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
  margin: 0;
}

.title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.65px;
}

.title a {
  color: inherit;
}

.info {
  font-size: 13px;
  letter-spacing: 0.35px;
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
