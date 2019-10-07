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

h4 {
  font-weight: 400;
  color: #889;
  border-bottom: 1px solid #dde;
  padding-bottom: 5px;
  margin-bottom: 0;
}

.listing.grid {
  display: grid;
  padding: 5px 15px;
  grid-gap: 15px 15px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}

.listing.grid .item {
  cursor: pointer;
  border-radius: 4px;
  color: inherit;
  border: 1px solid #ccd;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

.listing.grid .item:hover {
  border-color: #bbc;
  box-shadow: 0 2px 3px rgba(0,0,0,.05);
  text-decoration: none;
}

.listing.grid .item img {
  display: block;
  background: #fff;
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-bottom: 1px solid #eee;
}

.listing.grid .item .details {
  padding: 10px 12px;
}

.listing.grid .item .title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.listing.grid .item .author {
  font-size: 12px;
  line-height: 20px;
  color: gray;
}

.listing.grid .item .bottom-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  height: 20px;
  color: #555;
}

.listing.list .item {
  display: flex;
  cursor: pointer;
  padding: 10px;
  border-bottom: 1px solid #f0f0f5;
  color: inherit;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

.listing.list .item:hover {
  background-color: #f5f5fa;
  text-decoration: none;
}

.listing.list .item > * {
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing.list .item img {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
}

.listing.list .item .title {
  font-weight: 500;
}

.listing.list .item .author {
  color: #889;
}

.listing.list .item .label {
  padding: 0 5px;
  line-height: 16px;
  top: 0;
}

.item .visibility.public {
  color: var(--blue);
}

.item .visibility.unlisted {
  color: #889;
}

.item .visibility.private {
  color: inherit;
}
`
export default cssStr