import * as spellCheckerLib from '../../lib/spell-checker'

export function spellCheck (text) {
  return !isMisspelled(text)
}

export function isMisspelled (text) {
  const misspelled = spellCheckerLib.spellchecker.isMisspelled(text)
  if (!misspelled) {
    return false
  }
  if (spellCheckerLib.locale.match(/^en/) && spellCheckerLib.SKIP_LIST.includes(text)) {
    return false
  }
  return true
}

export function getSuggestions (text) {
  return spellCheckerLib.spellchecker.getCorrectionsForMisspelling(text)
}

export function add (text) {
  spellCheckerLib.spellchecker.add(text)
}