import {css} from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../../app-stdlib/css/colors.css.js'

const cssStr = css`
${colorsCSS}

:host {
  display: block;
  max-width: 500px;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #ccc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 10px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.title {
  font-size: 16px;
  margin-bottom: 5px;
}

.description {
  margin-bottom: 5px;
}

.author {
  color: gray;
}
`
export default cssStr