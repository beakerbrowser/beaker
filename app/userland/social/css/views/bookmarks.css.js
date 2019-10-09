import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from 'beaker://app-stdlib/css/colors.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  display: block;
}

.empty {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 4px;
  color: gray;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.bookmark {
  box-sizing: border-box;
  border: 1px solid #ccc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.bookmark .title {
  font-size: 16px;
  margin-bottom: 5px;
}
`
export default cssStr