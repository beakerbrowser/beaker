import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
}

.top-right-ctrls {
  position: fixed;
  top: 8px;
  right: 10px;
}

.top-right-ctrls a {
  display: inline-block;
  color: #556;
  background: #fff;
  border: 1px solid #ccd;
  border-top: 1px solid #2196F3;
  font-size: 13px;
  line-height: 26px;
  letter-spacing: 0.25px;
  font-weight: 400;
  padding: 0px 10px;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
}

.top-right-ctrls a:hover {
  background: #fafafd;
}

.top-right-ctrls a.pressed {
  background: #fafafd;
}

.top-right-ctrls a span {
  margin-left: 4px;
  font-size: 11px;
}

.files {
  display: grid;
  padding: 10vh 15px 5px 15px;
  margin: 50px auto 0;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 15px;
  width: 100%;
  max-width: 1000px;
  user-select: none;
}

.file {
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  background: #fff;
  overflow: hidden;
  user-select: none;
  min-height: 100px;
}

.file:hover {
  text-decoration: none;
}

.file .thumb {
  display: block;
  margin: 0 auto;
  border-radius: 4px;
  width: 180px;
  height: 120px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid #ccd;
}

.file:hover .thumb {
  border-color: #889;
}

.file .details {
  padding: 10px 2px 20px;
}

.file .details > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file .title {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.file.add span {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  color: rgba(0, 0, 150, 0.15);
}

.file.add:hover span {
  color: rgba(0, 0, 150, 0.25);
}

.dock-wrapper {
  position: absolute;
  top: 8px;
  left: 12px;
}

.dock {
}

.dock-separator {
  width: auto;
  padding: 3px 7px;
  margin-right: 25px;
  color: #bbb;
}

.dock-item {
  display: inline-block;
  width: auto;
  cursor: pointer;
  margin-bottom: 0;
  padding: 3px 7px;
  font-weight: 400;
  font-size: .7rem;
  letter-spacing: .5px;
  color: rgba(0,0,0,.65);
}

.dock-item:not(:last-child) {
  margin-right: 10px;
}

.dock-item:hover {
  color: @color-text;
  background: rgba(0,0,0,.075);
  border-radius: 2px;
}
`
export default cssStr