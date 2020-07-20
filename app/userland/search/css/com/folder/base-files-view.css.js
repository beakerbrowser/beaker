import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
}

.container {
  min-height: calc(100vh - 50px);
}

.empty {
  background: var(--empty-bg);
  padding: 40px;
  margin: 14px 0;
  border-radius: 8px;
  color: var(--empty-color);
}

.items {
  user-select: none;
}

.item {
  color: var(--base-files-view--color-text);
}

`
export default cssStr