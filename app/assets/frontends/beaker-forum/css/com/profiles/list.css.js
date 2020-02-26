import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import spinnerCSS from '../spinner.css.js'

const cssStr = css`
${buttonsCSS}
${spinnerCSS}

:host {
  display: block;
  margin: 20px 10px 40px;
}

a {
  color: var(--color-link);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.profiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, 400px);
  grid-gap: 20px;
}

.profile {
  display: flex;
  border-radius: 4px;
  border: 1px solid #ccd;
  align-items: center;
}

.avatar {
  align-self: stretch;
}

img {
  display: block;
  width: 120px;
  min-height: 120px;
  height: 100%;
  object-fit: cover;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.main {
  padding: 16px;
}

.title,
.info {
  margin: 0;
}

.title {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.65px;
  margin-bottom: 4px;
}

.title a {
  color: inherit;
}

.info {
  font-size: 13px;
  letter-spacing: 0.35px;
  opacity: 0.85;
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
