import { css } from '../../app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
.header {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 0 10px;
  user-select: none;
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

.header subview-tabs {
  margin-left: 14px;
}
`
export default cssStr