import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import emptyCSS from '../empty.css.js'
import labelCSS from '../label.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${emptyCSS}
${labelCSS}

:host {
  display: block;
  max-width: 600px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.listing {
  display: grid;
  grid-gap: 10px 10px;
  grid-template-columns: 1fr;
}

.item {
  cursor: pointer;
  display: flex;
  border-radius: 4px;
  color: inherit;
  border: 1px solid #ccd;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

.item:hover {
  border-color: #bbc;
  box-shadow: 0 2px 3px rgba(0,0,0,.05);
  text-decoration: none;
}

.item .favicon {
  width: 40px;
  padding: 14px 0 10px 10px;
  box-sizing: border-box;
}

.item img {
  display: block;
  background: #fff;
  width: 32px;
  height: 32px;
  object-fit: cover;
}

.item .details {
  padding: 10px 12px;
}

.item .title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}

.item .author {
  font-size: 12px;
  line-height: 20px;
  color: gray;
}

.item .bottom-line {
  font-size: 10px;
  height: 20px;
  color: #555;
}

.item .visibility.public {
  color: var(--blue);
}

.item .visibility.unlisted {
  color: gray;
}

.item .visibility.private {
  color: inherit;
}
`
export default cssStr