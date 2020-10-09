# skin-tone [![Build Status](https://travis-ci.org/sindresorhus/skin-tone.svg?branch=master)](https://travis-ci.org/sindresorhus/skin-tone)

> Change the skin tone of an emoji 👌👌🏻👌🏼👌🏽👌🏾👌🏿

The [Fitzpatrick scale](https://en.wikipedia.org/wiki/Fitzpatrick_scale#Unicode) is used to specify skin tones for emoji characters which represent humans.


## Install

```
$ npm install --save skin-tone
```


## Usage

```js
const skinTone = require('skin-tone');

skinTone('👍', skinTone.BROWN);
//=> '👍🏾'

// or by using the constant value directly
skinTone('👍', 4);
//=> '👍🏾

skinTone('👍', skinTone.WHITE);
//=> '👍🏻'

// can also remove skin tone
skinTone('👍🏾', skinTone.NONE);
//=> '👍'

// just passes it through when not supported
skinTone('🦄', skinTone.DARK_BROWN);
//=> '🦄'
```


## API

### skinTone(emoji, type)

#### emoji

Type: `string`

Emoji to modify.

#### type

Type: `number`<br>
Values:

- `skinTone.NONE`        | `0`:      *(Removes skin tone)*
- `skinTone.WHITE`       | `1`: 🏻   *(Fitzpatrick Type-1–2)*
- `skinTone.CREAM_WHITE` | `2`: 🏼   *(Fitzpatrick Type-3)*
- `skinTone.LIGHT_BROWN` | `3`: 🏽   *(Fitzpatrick Type-4)*
- `skinTone.BROWN`       | `4`: 🏾   *(Fitzpatrick Type-5)*
- `skinTone.DARK_BROWN`  | `5`: 🏿   *(Fitzpatrick Type-6)*


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
