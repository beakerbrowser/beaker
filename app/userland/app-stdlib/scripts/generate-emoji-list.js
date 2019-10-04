const fs = require('fs')

const DISALLOWED = new Set([
  '🔫',
  '🔪',
  '🖕',
  '🗡️'
])

var emojiDataStr = fs.readFileSync(require('path').join(__dirname, 'emoji-data.txt'), 'utf8')

var groups = []
for (let groupStr of emojiDataStr.split('# group: ').slice(1)) {
  let name = (/(.*)\n/.exec(groupStr))[1]
  let emojis = new Set()

  if (name === 'Component') {
    continue // skip
  }

  let re = /$([0-9A-F\.\s]+);/gim
  let match
  while ((match = re.exec(groupStr))) {
    let emoji = match[1].trim().split(' ').map(v => String.fromCodePoint(parseInt(v, 16))).join('') // parse out emoji
    emoji = emoji.replace(/🏻|🏼|🏽|🏾|🏿/g, '') // strip skin tones
    if (DISALLOWED.has(emoji)) continue // skip disallowed emojis
    emojis.add(emoji)
  }

  groups.push({name, emojis: Array.from(emojis)})
}

fs.writeFileSync(require('path').join(__dirname, 'emoji-list.js'), `
export const SUGGESTED = [
  "❤",
  "👀",
  "🔥",
  "🎉",
  "✨",
  "🆒",
  '🙂',
  '😂',
  "😅",
  '😢',
  "😐",
  "😮",
  '😡',
  "😤",
  "🤭",
  "🤔",
  "🤨",
  "🤯",
  '👍',
  "👎",
  "👆",
  "👏",
  "🙌",
  "🙏",
  "👋",
  "💪",
  "💅",
  "✊",
  "👌",
  "🤘",
]

export const GROUPS = ${JSON.stringify(groups, null, 2)}

export const FULL_LIST = GROUPS.map(({emojis}) => emojis).reduce((acc, v) => acc.concat(v), [])
`)