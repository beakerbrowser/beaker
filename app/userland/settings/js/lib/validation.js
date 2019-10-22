export function oneof (v, fallback, opts) {
  if (opts.includes(v)) return v
  return fallback
}