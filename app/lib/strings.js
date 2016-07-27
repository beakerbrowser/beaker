export function ucfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function pluralize (num, base, suffix='s') {
  if (num === 1)
    return base
  return base + suffix
}