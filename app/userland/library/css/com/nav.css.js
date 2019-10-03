import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 180px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px 0 30px;
  box-sizing: border-box;
  z-index: 2;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  background: #fff;
  user-select: none;
}

a.item {
  position: relative;
  padding: 8px 15px;
  margin-bottom: 2px;
  color: #34495e;
  text-decoration: none;
  box-sizing: border-box;
  cursor: pointer;
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;
  transition: background 0.3s;
}

a.item:hover {
  background: #f0f0f5;
}

a.item.current {
  color: var(--blue);
  font-weight: 500;
}

a.item.todo {
  opacity: 0.5;
}

a.item > .fa-fw {
  margin-right: 5px;
}

a.item .avatar {
  position: relative;
  top: -1px;
  vertical-align: middle;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 5px;
}

.fa-external-link-alt {
  position: relative;
  top: -1px;
  font-size: 8px;
  color: rgba(0,0,0,.5);
  margin-left: 2px;
}

h5 {
  padding: 5px 15px 8px;
  margin: 0;
}

.spacer {
  flex: 1;
}

hr {
  border: 0;
  border-top: 1px solid #ddd;
  width: 154px;
  margin: 10px;
}

.search-container {
  position: relative;
  margin: 0 0 10px 7px;
}

input.search {
  font-size: 12px;
  border: 0;
  background: #f0f0f5;
  outline: 0;
  box-sizing: border-box;
  width: 172px;
  border-radius: 16px;
  height: 27px;
  padding-left: 32px;
}

.search-container > i.fa-search  {
  position: absolute;
  left: 12px;
  top: 8px;
  color: rgba(0,0,0,.6);
  font-size: 11px;
}

`
export default cssStr