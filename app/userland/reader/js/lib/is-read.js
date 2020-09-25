export function isRead (url) {
  return localStorage.getItem(`read:${url}`) === '1'
}

export function markRead (url, v) {
  localStorage.setItem(`read:${url}`, v ? '1' : '0')
}