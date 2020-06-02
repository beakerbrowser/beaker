import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

.links {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.links .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.links .empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: #d3d3d8;
}

.link {
  display: flex;
  align-items: center;
  padding: 18px 20px;
  color: #555;
  border-bottom: 1px solid #dde;
}

:host(.top-border) .link:first-child {
  border-top: 1px solid #dde;
}

.link:hover {
  text-decoration: none;
  background: #fafafd;
}

.link > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link img {
  display: block;
  width: 16px;
  height: 16px;
  margin-right: 20px;
  object-fit: cover;
}

.link .title {
  flex: 1;
  font-weight: 500;
  margin-right: 20px;
}

.link .url {
  flex: 1;
  color: #99a;
}

`
export default cssStr