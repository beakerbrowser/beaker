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
  padding-top: 40px;
  padding-bottom: 100vh;
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
  font-weight: bold;
  letter-spacing: 0.6px;
  margin: 15px 20px 0;
  font-size: 36px;
  color: #ccccd8;
}

.listing {
  margin-bottom: 30px;
}

.listing.grid {
  display: grid;
  padding: 15px 30px;
  grid-gap: 15px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}

.listing.grid .item {
  cursor: pointer;
  border-radius: 4px;
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
  margin: 10px 30px 30px;
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
  font-weight: bold;
  color: #667;
}

.listing.list .item .href {
  color: var(--blue);
}

.listing.list .item .writable {
  width: 40px;
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
`
export default cssStr