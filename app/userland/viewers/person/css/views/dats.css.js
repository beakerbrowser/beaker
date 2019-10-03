import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from 'beaker://app-stdlib/css/colors.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}

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

.item {
  display: flex;
  margin: 0 0 5px;
  padding: 12px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  max-width: 600px;
  user-select: none;
}

.item .thumb {
  margin-right: 14px;
}

.item .thumb img {
  display: block;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
}

.item .title {
  font-size: 18px;
  margin-bottom: 4px;
}

.item .description {
  font-size: 14px;
}

.item .bottom-line {
  margin-bottom: 4px;
}

.item .author {
  font-size: 12px;
  line-height: 20px;
  color: gray;
}

`
export default cssStr