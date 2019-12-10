import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
  position: relative;
  background: #fff;
  border-radius: 8px;
  text-align: center;
  padding: 60px 20px 10px;
  margin: 70px 0 10px;
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
  left: 50%;
  top: -70px;
  transform: translateX(-50%);

  display: block;
  margin: 0 auto;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #ccd;
}

button {
  position: absolute;
  top: 20px;
  left: calc(50% + 120px);
  transform: translateX(-50%);
  font-size: 14px;
}

.title,
.id {
  margin: 0;
}

.title a {
  color: inherit;
}

.stats {
  font-size: 16px;
}

.stats a + a {
  margin-left: 10px;
}

.stats a strong {
  color: #334;
}

`
export default cssStr
