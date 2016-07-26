// helper to give a hypercore feed's blocks listing as a bitfield, as an array of bools
export default function toBitfield (feed) {
  var list = []
  for (var i = 0; i < feed.blocks; i++) {
    list.push(feed.has(i))
  }
  return list
}