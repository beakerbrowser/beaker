import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
  padding: 10px;
}

input {
  display: block;
  width: 100%;
  margin: 10px 0 0;
}

.ctrls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ctrls label {
  font-weight: normal;
}
`
export default cssStr