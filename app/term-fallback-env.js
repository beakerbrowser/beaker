export function get_number () {
  return 5
}

export function get_array () {
  return [1, 2, 3, 4, 5]
}

export function get_string () {
  return 'Hello, world!'
}

export function get_object (n) {
  n = n || 0
  return {
    number: get_number(),
    string: get_string(),
    array: get_array(),
    object: (n < 3) ? get_object(++n) : undefined
  }
}