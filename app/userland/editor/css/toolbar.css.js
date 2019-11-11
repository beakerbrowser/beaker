import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
.toolbar {
  display: flex;
  align-items: center;
  height: 26px;
  background: var(--background);
  color: var(--default);
}

.toolbar > * {
  margin-left: 5px;
}

.toolbar > :last-child {
  margin-right: 5px;
}

.toolbar button {
  padding: 0 8px;
  height: 26px;
  line-height: 24px;
  color: inherit;
  border-radius: 0;
}

.toolbar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toolbar button .fa-fw {
  font-size: 10px;
}

.toolbar .text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar .spacer {
  flex: 1;
}

@media (max-width: 600px) {
  .toolbar .btn-label {
    display: none;
  }
}
@media (min-width: 601px) {
  .tooltip-onsmall[data-tooltip]:hover:after,
  .tooltip-onsmall[data-tooltip]:hover:before {
    display: none;
  }
}
`
export default cssStr