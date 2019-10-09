import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`

:host {
  --color-folder: #9ec2e0;
  --color-file: #bbbbcc;
  --color-itemname: #484444;
  --color-hover-bg: #f3f3f8;
  --color-selected-bg: #e4e4ec;
}

h4 {
  border-top: 1px solid #e3e3ee;
  color: #80808c;
  padding-top: 6px;
  padding-left: 4px;
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 110px);
  grid-template-rows: repeat(auto-fill, 86px);
  grid-gap: 15px;
  margin: 15px 0;
  width: 100%;
  user-select: none;
}

.item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px;
}

.item .fa-fw {
  font-size: 40px;
  line-height: 40px;
  margin-bottom: 5px;
}

.item .fa-folder {
  color: var(--color-folder);
}

.item .fa-file {
  -webkit-text-stroke: 1px var(--color-file);
  color: #fff;
  font-size: 36px;
  margin-top: 1px;
  margin-bottom: 4px;
}

.item .name {
  color: var(--color-itemname);
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  border-radius: 4px;
}

.item .fa-external-link-square-alt {
  position: absolute;
  top: 18px;
  left: 57px;
  color: rgba(0,0,0,.3);
}

.item.selected {
}

.item.selected .name {
  background: var(--color-selected-bg);
}

`
export default cssStr