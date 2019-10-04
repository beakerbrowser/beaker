import {css} from '../../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
}

beaker-status-composer,
beaker-status {
  margin-bottom: 10px;
  --body-font-size: 14px;
}

.empty {
  background: #fafafa;
  padding: 40px 0 0;
  color: #8a8a8a;
  text-align: center;
  min-height: 200px;
}

.empty .fas {
  font-size: 85px;
  margin-bottom: 30px;
  color: #ccc;
}
`
export default cssStr
