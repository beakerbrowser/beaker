import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
.dropdown {
  position: relative;
}

.dropdown.open .toggleable:not(.primary) {
  background: #dadada;
  box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.1);
  border-color: transparent;
  outline: 0;
}

.toggleable-container .dropdown-items {
  display: none;
}

.toggleable-container.hover:hover .dropdown-items,
.toggleable-container.open .dropdown-items {
  display: block;
}

.dropdown-items {
  width: 270px;
  position: absolute;
  right: 0px;
  z-index: 3000;
  background: #fff;
  border: 1px solid #dadada;
  border-radius: 10px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.dropdown-items .section {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 5px 0;
}

.dropdown-items .section-header {
  padding: 2px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-items .section-header.light {
  color: var(--color-text--light);
  font-weight: 500;
}

.dropdown-items .section-header.small {
  font-size: 12px;
}

.dropdown-items hr {
  border: 0;
  border-bottom: 1px solid #ddd;
}

.dropdown-items.thin {
  width: 170px;
}

.dropdown-items.wide {
  width: 400px;
}

.dropdown-items.compact .dropdown-item {
  padding: 2px 15px;
  border-bottom: 0;
}

.dropdown-items.compact .description {
  margin-left: 0;
}

.dropdown-items.compact hr {
  margin: 5px 0;
}

.dropdown-items.roomy .dropdown-item {
  padding: 10px 15px;
}

.dropdown-items.very-roomy .dropdown-item {
  padding: 20px 30px;
}

.dropdown-items.no-border .dropdown-item {
  border-bottom: 0;
}

.dropdown-items.center {
  left: 50%;
  transform: translateX(-50%);
}

.dropdown-items.left {
  right: initial;
  left: 0;
}

.dropdown-items.over {
  top: 0;
}

.dropdown-items.top {
  bottom: calc(100% + 5px);
}

.dropdown-items.with-triangle:before {
  content: '';
  position: absolute;
  top: -8px;
  right: 10px;
  width: 12px;
  height: 12px;
  z-index: 3;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #fff;
}

.dropdown-items.with-triangle.left:before {
  left: 10px;
}

.dropdown-items.with-triangle.center:before {
  left: 43%;
}

.dropdown-title {
  border-bottom: 1px solid #eee;
  padding: 2px 8px;
  font-size: 11px;
  color: gray;
}

.dropdown-item {
  display: block;
  padding: 7px 15px;
  border-bottom: 1px solid #eee;
}

.dropdown-item.disabled {
  opacity: 0.25;
}

.dropdown-item .fa-check-square {
  color: var(--color-blue);
}

.dropdown-item .fa-check-square,
.dropdown-item .fa-square-o {
  font-size: 14px;
}

.dropdown-item .fa-check {
  font-size: 11.5px;
}

.dropdown-item.no-border {
  border-bottom: 0;
}

.dropdown-item:hover:not(.no-hover) {
  background: #eee;
  cursor: pointer;
}

.dropdown-item:hover:not(.no-hover) i:not(.fa-check-square) {
  color: var(--color-text);
}

.dropdown-item:hover:not(.no-hover) .description {
  color: var(--color-text);
}

.dropdown-item:hover:not(.no-hover).disabled {
  background: inherit;
  cursor: default;
}

.dropdown-item .fa,
.dropdown-item i {
  display: inline-block;
  width: 20px;
  color: rgba(0, 0, 0, 0.65);
}

.dropdown-item .fa-fw {
  margin-left: -3px;
  margin-right: 3px;
}

.dropdown-item img {
  display: inline-block;
  width: 16px;
  position: relative;
  top: 3px;
  margin-right: 6px;
}

.dropdown-item .btn .fa {
  color: inherit;
}

.dropdown-item .label {
  font-weight: 500;
  margin-bottom: 3px;
}

.dropdown-item .description {
  color: var(--color-text--muted);
  margin: 0;
  margin-left: 23px;
  margin-bottom: 3px;
  line-height: 1.5;
}

.dropdown-item .description.small {
  font-size: 12.5px;
}

.dropdown-item:first-of-type {
  border-radius: 2px 2px 0 0;
}

.dropdown-item:last-of-type {
  border-radius: 0 0 2px 2px;
}
`
export default cssStr
