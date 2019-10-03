import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import emptyCSS from '../empty.css.js'
import labelCSS from '../label.css.js'
import viewHeaderCSS from '../view-header.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${emptyCSS}
${labelCSS}
${viewHeaderCSS}

:host {
  display: block;
  margin: 0px 10px 50px 190px;
}

@media (min-width: 1300px) {
  .empty {
    position: relative;
    left: -90px;
  }
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
  padding: 15px;
  grid-gap: 15px 15px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}

.item {
  cursor: pointer;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  border: 1px solid #ccc;
  background: #fff;
  user-select: none;
}

.item:hover {
  border-color: #bbb;
  box-shadow: 0 2px 3px rgba(0,0,0,.05);
  text-decoration: none;
}

.item img {
  display: block;
  background: #fff;
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-bottom: 1px solid #eee;
}

.item .details {
  padding: 10px 12px;
}

.item .title {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.item .author {
  font-size: 12px;
  line-height: 20px;
  color: gray;
}

.item .bottom-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  height: 20px;
  color: #555;
}

.item .bottom-line button {
  font-size: 9px;
  padding: 4px 6px;
}

.item .followers {
  font-size: 11px;
  color: gray;
}

`
export default cssStr