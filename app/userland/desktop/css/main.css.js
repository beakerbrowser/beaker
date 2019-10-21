import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}

:host {
  display: block;
}

.header {
  height: 47px;
}

.pins {
  display: grid;
  padding: 15px;
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
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}

.pin.add span {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: rgba(0, 0, 0, 0.15);
}
`
export default cssStr