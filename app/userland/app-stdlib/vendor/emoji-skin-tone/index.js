/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

const emojiModifierBase = new Set([
	0x261D,
	0x26F9,
	0x270A,
	0x270B,
	0x270C,
	0x270D,
	0x1F385,
	0x1F3C3,
	0x1F3C4,
	0x1F3CA,
	0x1F3CB,
	0x1F442,
	0x1F443,
	0x1F446,
	0x1F447,
	0x1F448,
	0x1F449,
	0x1F44A,
	0x1F44B,
	0x1F44C,
	0x1F44D,
	0x1F44E,
	0x1F44F,
	0x1F450,
	0x1F466,
	0x1F467,
	// 0x1F468, SUPPORT (prf)
	// 0x1F469, SUPPORT (prf)
	0x1F46E,
	0x1F470,
	0x1F471,
	0x1F472,
	0x1F473,
	0x1F474,
	0x1F475,
	0x1F476,
	0x1F477,
	0x1F478,
	0x1F47C,
	0x1F481,
	0x1F482,
	0x1F483,
	0x1F485,
	0x1F486,
	0x1F487,
	0x1F4AA,
	0x1F575,
	0x1F57A,
	0x1F590,
	0x1F595,
	0x1F596,
	0x1F645,
	0x1F646,
	0x1F647,
	0x1F64B,
	0x1F64C,
	0x1F64D,
	0x1F64E,
	0x1F64F,
	0x1F6A3,
	0x1F6B4,
	0x1F6B5,
	0x1F6B6,
	0x1F6C0,
	0x1F918,
	0x1F919,
	0x1F91A,
	0x1F91B,
	0x1F91C,
	// 0x1F91D, SUPPORT (prf)
	0x1F91E,
	0x1F926,
	0x1F930,
	0x1F933,
	0x1F934,
	0x1F935,
	0x1F936,
	0x1F937,
	0x1F938,
	0x1F939,
	// 0x1F93C, SUPPORT (prf)
	0x1F93D,
	0x1F93E
]);


const skinTones = [
	{
		name: 'NONE',
		color: ''
	},
	{
		name: 'WHITE',
		color: '🏻'
	},
	{
		name: 'CREAM_WHITE',
		color: '🏼'
	},
	{
		name: 'LIGHT_BROWN',
		color: '🏽'
	},
	{
		name: 'BROWN',
		color: '🏾'
	},
	{
		name: 'DARK_BROWN',
		color: '🏿'
	}
];

export const NONE = 0
export const WHITE = 1
export const CREAM_WHITE = 2
export const LIGHT_BROWN = 3
export const BROWN = 4
export const DARK_BROWN = 5

export function set (emoji, type) {
	if (type > 5 || type < 0) {
		throw new TypeError(`Expected \`type\` to be a number between 0 and 5, got ${type}`);
	}

	// TODO: Use this instead when targeting Node.js 6
	// emoji = emoji.replace(/[\u{1f3fb}-\u{1f3ff}]/u, '');
	skinTones.forEach(x => {
		emoji = emoji.replace(x.color, '');
	});

	if (emojiModifierBase.has(emoji.codePointAt(0)) && type !== 0) {
		emoji += skinTones[type].color;
	}

	return emoji;
}
