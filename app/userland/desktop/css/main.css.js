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
  padding: 0 15px;
}

header {
  display: grid;
  grid-template-columns: 1fr 100px;
  max-width: 1000px;
  margin: 50px auto;
}

header .search-ctrl {
  position: relative;
}

header .search-ctrl .fa-search {
  position: absolute;
  top: 12px;
  left: 15px;
  font-size: 16px;
  color: #99a;
}

header .search-ctrl input {
  background: #f0f0f6;
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  font-size: 14px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 42px;
  border: 0;
  border-radius: 4px;
  box-shadow: none;
}

header .search-ctrl input::placeholder {
  letter-spacing: 1px;
  font-size: 14px;
  font-weight: 400;
}

header .new-btn {
  display: block;
  background: #2864dc;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  border-radius: 2px;
  height: 38px;
  line-height: 38px;
  margin: 1px 10px;
  cursor: pointer;
}

header .new-btn .fas {
  font-size: 13px;
  margin-left: 4px;
}

header .new-btn.pressed,
header .new-btn:hover {
  background: #1957d2;
  text-decoration: none;
}

.files {
  display: grid;
  margin: 0 auto;
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

drives-view {
  display: block;
  max-width: 1000px;
  margin: 30px auto;
  border-top: 1px solid #dde;
}
`
export default cssStr