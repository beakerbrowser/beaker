import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import formCSS from '../form.css.js'

const cssStr = css`
${formCSS}
${buttonsCSS}

p {
  margin: 5px 0;
}

p.error {
  margin: 5px 0 10px;
  color: #cc1010;
}

p.copy-path {
  display: flex;
  margin-top: 5px;
  margin-bottom: 0;
}

p.copy-path input {
  flex: 1;
  font-size: 12px;
  border: 0;
  background: #eee;
  padding: 0 5px;
  margin-right: 5px;
}

p.copy-path .btn.full-width {
  margin-top: 10px;
}

`
export default cssStr