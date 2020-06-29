import {css} from '../vendor/lit-element/lit-element'

export default css`
hr {
  border: 0;
  border-bottom: 1px solid var(--border-color--default);
}

.section {
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color--default);
}

.menu-item {
  display: flex;
}

.menu-item {
  align-items: center;
  height: 25px;
  padding: 0 15px;
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item:hover {
  background: var(--bg-color--menu-item--hover);
}

.menu-item i {
  color: var(--text-color--menu-item-icon);
  width: 28px;
  font-size: 13px;
  padding-right: 5px;
  text-align: center;
  margin-left: -5px;
}

.menu-item .favicon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  margin-right: 10px;
}

.menu-item.disabled {
  opacity: 0.5;
}

.menu-item.disabled:hover {
  background: none;
}

.menu-item .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item i.more {
  margin-left: auto;
  padding-right: 0;
  text-align: right;
  color: var(--text-color--menu-item-icon--light);
}

.header {
  position: relative;
  width: 100%;
  height: 35px;
  line-height: 35px;
  text-align: center;
  border-bottom: 1px solid var(--border-color--default);
}

.header h2 {
  font-size: 12.5px;
  margin: 0;
  padding-right: 10px;
}

.header .btn {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 27px;
  height: 27px;
  border: 0;
  background: transparent;
  border-radius: 4px;
}

.header .btn i {
  font-size: 18px;
  color: var(--text-color--menus-wrapper);
  line-height: 27px;
}

.header .btn:focus {
  outline: 0;
}

.header .btn:hover {
  background: var(--bg-color--header-btn--hover);
}
`