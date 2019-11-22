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

.header {
  height: 47px;
}

.relative {
  position: relative;
}

.ctrl-bar {
  position: fixed;
  top: 0;
  height: 100vh;
  z-index: 2;
  display: flex;
  flex-direction: column;
  background: #f1f1f6;
  width: 55px;
  padding-top: 10px;
}

.ctrl-bar.left {
  left: 0;
  border-top-right-radius: 12px;
}

.ctrl-bar.right {
  right: 0;
  border-top-left-radius: 12px;
}

.ctrl-bar .ctrl {
  display: block;
  margin-bottom: 12px;
  border-radius: 0;
  padding: 5px 10px;
  text-align: center;
}

.ctrl-bar .ctrl:hover {
  background: transparent;
}

.ctrl-bar .ctrl.profile {
  margin-top: -12px;
  margin-bottom: 8px;
}

.ctrl-bar .ctrl.profile::before {
  left: calc(100% + 26px);
}

.ctrl-bar .ctrl.profile::after {
  left: calc(100% + 20px) !important;
}

.ctrl-bar .ctrl img {
  height: 60px;
  width: 60px;
  object-fit: contain;
  border-radius: 50%;
  border: 4px solid #fff;
  box-shadow: rgb(241, 241, 246) 0px 0px 0px 4px;
  background: rgb(241, 241, 246);
}

.ctrl-bar .ctrl span,
.ctrl-bar .ctrl img {
  transition: transform 0.25s, color 0.25s, box-shadow 0.25s;
  transform: scale(1.0);
}

.ctrl-bar .ctrl:hover span,
.ctrl-bar .ctrl:hover img {
  transform: scale(1.2);
  color: #223;
  box-shadow: rgb(241, 241, 246) 0px 0px 0px 0px;
}

.ctrl-bar .icon {
  font-size: 17px;
  color: #445;
}

.ctrl-bar .fas.fa-user-friends,
.ctrl-bar .fas.fa-sitemap,
.ctrl-bar .fas.fa-terminal {
  font-size: 15px;
}

.ctrl-bar .plusmod {
  position: absolute;
  font-size: 6px;
  top: -6px;
  right: -6px;
}

.pins {
  display: grid;
  padding: 5px 95px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  grid-gap: 15px;
  width: 100%;
  user-select: none;
}

.pin {
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  background: #fff;
  overflow: hidden;
  user-select: none;
  transition: background 0.3s;
  min-height: 100px;
}

.pin:hover {
  background: #f2f2f8;
  text-decoration: none;
}

.pin .favicon {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  border-radius: 4px;
  width: 28px;
  height: 28px;
}

.pin .details {
  padding: 60px 12px 20px;
}

.pin .details > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin .title {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.pin.add span {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: rgba(0, 0, 150, 0.15);
}
`
export default cssStr