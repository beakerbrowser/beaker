import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`

:host {
  --color-drive: #ccd;
  --color-folder: #9ec2e0;
  --color-file: #bbbbcc;
  --color-goto: #bbbbce;
  --color-itemname: #484444;
  --color-itemdrive: #99a;
  --color-viewfile: #ffffff;
  --color-viewfile-outline: #a7a7ad;
  --color-hover-bg: #f3f3f8;
  --color-selected-fg: #fff;
  --color-selected-bg: #4379e4;
  --color-selected-bg-icon: #dddde5;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, 110px);
  grid-template-rows: repeat(auto-fill, 86px);
  grid-gap: 15px;
  margin: 15px 0;
  width: 100%;
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

.item .fa-fw.fa-folder {
  color: var(--color-folder);
}

.item .mainicon.fa-fw.fa-hdd {
  color: var(--color-drive);
}

.item .fa-fw.fa-layer-group {
  -webkit-text-stroke: 1px var(--color-viewfile-outline);
  color: var(--color-viewfile);
  font-size: 36px;
}

.item .fa-fw.fa-external-link-alt {
  font-size: 28px;
  color: var(--color-goto);
}

.item .fa-fw.fa-file {
  -webkit-text-stroke: 1px var(--color-file);
  color: #fff;
  font-size: 36px;
  margin-top: 1px;
  margin-bottom: 4px;
}

.item .name,
.item .author {
  color: var(--color-itemname);
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  border-radius: 4px;
}

.item .author {
  color: var(--color-itemdrive);
  font-size: 10px;
}

.item .subicon {
  position: absolute;
  top: 22px;
  left: 40px;
  color: rgba(0,0,0,.4);
}

.item .mounticon {
  position: absolute;
  color: #5a5a5a;
  left: 57px;
  top: 16px;
  font-size: 16px;
}

.item .subicon.fa-star {
  top: 19px;
  left: 38px;
}

.item.mount .subicon {
  top: 27px;
  font-size: 9px;
  left: 36px;
}

.item.selected {
}

.item.selected .fa-fw {
  background: var(--color-selected-bg-icon);
  border-radius: 4px;
}

.item.selected .name {
  background: var(--color-selected-bg);
  color: var(--color-selected-fg);
}

`
export default cssStr