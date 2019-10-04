import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  --border-color: #d4d7dc;
  --fallback-cover-color: linear-gradient(to bottom, hsla(216, 82%, 60%, 1), hsla(216, 82%, 55%, 1));
  --fallback-avatar-color: #e6edf1;

  display: block;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

a {
  text-decoration: none;
  color: inherit;
}

a:hover {
  text-decoration: underline;
}

.cover-photo img {
  width: 100%;
  height: 100px;
  object-fit: cover;
}

.cover-photo .fallback-cover {
  width: 100%;
  height: 100px;
  background: var(--fallback-cover-color);
}

.avatar {
  position: relative;
}

.avatar img,
.avatar .fallback-avatar {
  position: absolute;
  left: 10px;
  top: -40px;
  width: 75px;
  height: 75px;
  border-radius: 50%;
  border: 3px solid #fff;
  object-fit: cover;
}

.avatar .fallback-avatar {
  background: var(--fallback-avatar-color);
}

.ident {
  padding: 10px 10px 10px 100px;
}

.title {
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.domain {
  color: var(--color-text--muted);
  font-weight: 500;
}

.description {
  padding: 6px 14px;
}

.description.extra-pad {
  padding-bottom: 14px;
}

.controls {
  padding: 6px 14px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.followers {
  padding: 6px 14px;
  background: #fafafd;
}

.followers h5 {
  margin: 0 0 6px;
  font-weight: 500;
}

.followers p {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.followers img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.follows-you {
  display: inline-block;
  padding: 2px 6px 3px;
  border-radius: 4px;
  background: #d2dbe4;
  color: rgb(59, 62, 66);
  font-weight: 500;
  margin-right: 7px;
  font-size: 10px;
}
`
export default cssStr
