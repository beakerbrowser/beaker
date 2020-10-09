import { FULL_LIST } from '../data/emoji-list.js'
import * as skinTone from '../vendor/emoji-skin-tone/index.js'

const EMOJI_VARIANT = `\uFE0F` // this codepoint forces emoji rendering rather than symbolic

export function setSkinTone (emoji, tone) {
  return skinTone.set(emoji, tone)
}

export function render (emoji, tone = false) {
  emoji = emoji.replace('\uFE0F', '').replace('\uFE0E', '')
  return (tone === false ? emoji : skinTone.set(emoji, tone)) + EMOJI_VARIANT
}

export function renderSafe (emoji, tone = false) {
  // if (!isSupported(emoji)) return '' TODO needed?
  return render(emoji, tone)
}

export function isSupported (emoji) {
  if (!emoji || typeof emoji !== 'string') return false
  emoji = emoji.replace('\uFE0F', '').replace('\uFE0E', '')
  return FULL_LIST.indexOf(skinTone.set(emoji, skinTone.NONE)) !== -1
}