import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
.votectrl {
  position: relative;
  top: 0;
}

.votectrl > * {
  display: block;
  line-height: 0.8;
  color: #bbc;
}

.votectrl .karma,
.votectrl .fas {
  width: 30px;
  text-align: center;
}

.votectrl .karma {
  color: #889;
  font-weight: 600;
}

.votectrl .fas {
  font-size: 16px;
  cursor: pointer;
}

.votectrl .upvoted,
.votectrl .upvote:hover,
.votectrl .upvote.selected {
  color: var(--vote-color);
}

.votectrl .downvoted,
.votectrl .downvote:hover,
.votectrl .downvote.selected {
  color: var(--vote-color);
}
`
export default cssStr
