import _get from 'lodash.get'

export const BUILTIN_THEMES = [
  {url: 'builtin:blogger', title: 'Blogger', manifest: {theme: {drive_types: 'user'}}},
  {url: 'builtin:simple-wiki', title: 'Simple Wiki', manifest: {theme: {drive_types: 'website'}}},
  {url: 'builtin:simple-module', title: 'Simple Module', manifest: {theme: {drive_types: 'module'}}}
]

export function filterThemeByType (manifest, targetType) {
  var matchingTypes = _get(manifest, 'theme.drive_types', undefined)
  if (!matchingTypes) return true
  matchingTypes = Array.isArray(matchingTypes) ? matchingTypes : [matchingTypes]
  for (let matchingType of matchingTypes) {
    if (matchingType === '*') return true
    if (!matchingType && !targetType) return true
    if (matchingType === targetType) return true
  }
  return false
}