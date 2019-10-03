import {css} from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../../app-stdlib/css/colors.css.js'

const cssStr = css`
${colorsCSS}

:host {
  display: flex;
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

img {
  display: block;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 16px;
}

.title {
  font-size: 16px;
  margin-bottom: 5px;
}

`
export default cssStr