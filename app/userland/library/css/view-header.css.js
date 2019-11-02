import { css } from '../../app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 2;

  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 0 4px;
  user-select: none;
  background: #fff;
}

.header button {
  margin-right: 10px;
}

.spacer {
  flex: 1;
}

.header button {
  font-size: 12px;
}

.header button .fa-fw {
  font-size: 11px;
}

.header hr {
  border: 0;
  border-left: 1px solid #ddd;
  height: 16px;
  margin: 0;
}

.header hover-menu {
  margin: 0 6px;
}

.header hover-menu + hover-menu {
  margin-left: 0;
}

.header subview-tabs {
  margin-left: 14px;
}
`
export default cssStr