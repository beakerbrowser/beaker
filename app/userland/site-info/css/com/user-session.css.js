import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import formCSS from '../form.css.js'

const cssStr = css`
${formCSS}
${buttonsCSS}

.field-group {
  display: block;
  padding: 12px;
  border-bottom: 1px solid #ccc;
}

.field-group > div {
  margin-bottom: 5px;
}

.perm-label-fixedwith {
  display: inline-block;
  text-align: left;
  width: 90px;
}

.user {
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.user img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
}

.user .title {
  font-weight: bold;
}
`
export default cssStr