import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
}

beaker-record {
  display: block;
  border-bottom: 1px solid var(--border-color--light);
}

beaker-record.unread {
  background: var(--bg-color--unread);
}
`
export default cssStr