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
}

main {
  margin: 30px 0 50vh;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.flex1 { flex: 1; }
.flex2 { flex: 2; }
.flex3 { flex: 3; }
.flex4 { flex: 4; }

h4 {
  letter-spacing: 0.7px;
  font-size: 24px;
  border-top: 1px solid #bbc;
  color: #667;
  padding: 16px 24px;
  margin: 0px;
}

.twocol-grouping {
  display: grid;
  grid-template-columns: 260px 1fr;
}

.twocol-grouping > :first-child {
  border-right: 1px solid #bbc;
}

.listing {
  padding: 6px 40px 28px;
}

.listing.grid {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}

.listing.grid .item {
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #dde;
  color: inherit;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

.listing.grid .item:hover {
  background: #fafaff;
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

.listing.list {
}

.listing.list .item {
  display: flex;
  cursor: pointer;
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 4px;
  color: inherit;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

.listing.list .item:hover {
  background: #fafaff;
  text-decoration: none;
}

.listing.list .item > * {
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #889;
}

.listing.list .item img {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
}

.listing.list .item img.avatar {
  border-radius: 50%;
}

.listing.list .item .title {
  font-weight: 500;
  color: #667;
}

.listing.list .item .href {
  color: var(--blue);
}

.listing.list .item .label {
  padding: 0 5px;
  line-height: 16px;
  top: 0;
}

.listing.list .item button {
  padding: 1px 4px;
}

.item .visibility {
  width: 62px;
}

.item .visibility.public {
  color: var(--blue);
}

.item .visibility.private {
  color: inherit;
}

.listing.list .item.adder {
  background: rgba(255, 255, 255, 0.5);
}

.listing.list .item.adder:hover {
  background: rgba(255, 255, 255, 0.85);
}

.listing.grid .item.adder {
  position: relative;
  border: 0;
  background: rgba(255, 255, 255, 0.4);
  min-height: 170px;
}

.listing.grid .item.adder:hover {
  background: rgba(255, 255, 255, 0.7);
}

.listing.grid .item.adder .fa-fw {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 30px;
  color: rgba(0, 0, 0, 0.15);
}
`
export default cssStr