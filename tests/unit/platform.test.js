import test from 'node:test';
import assert from 'node:assert/strict';
import { isHandheld } from '../../src/ui/platform.js';

const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const CHROME_LINUX = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const PIXEL = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const media = (matches) => (query) => matches.includes(query);
const MOUSE = media(['(pointer: fine)', '(any-pointer: fine)', '(any-hover: hover)']);
const FINGER = media(['(pointer: coarse)']);

test('computers are let in, a touch-screen laptop included', () => {
  assert.equal(isHandheld({ userAgent: CHROME_WINDOWS, maxTouchPoints: 0, media: MOUSE }), false);
  assert.equal(isHandheld({ userAgent: SAFARI_MAC, maxTouchPoints: 0, media: MOUSE }), false);
  // a laptop with a touch screen: touch points, but its trackpad is fine and hovers
  assert.equal(isHandheld({ userAgent: CHROME_WINDOWS, maxTouchPoints: 10, media: media(['(pointer: fine)', '(any-pointer: fine)', '(any-pointer: coarse)', '(any-hover: hover)']) }), false);
});

test('phones and tablets are known by their user agent, or by having only a finger', () => {
  assert.equal(isHandheld({ userAgent: PIXEL, maxTouchPoints: 5, media: FINGER }), true);
  assert.equal(isHandheld({ userAgent: IPHONE, maxTouchPoints: 5, media: FINGER }), true);
  // an iPad asking for the desktop site calls itself a Mac, but has touch points
  assert.equal(isHandheld({ userAgent: SAFARI_MAC, maxTouchPoints: 5, media: FINGER }), true);
  // an Android phone asking for the desktop site calls itself Linux, but has only a finger
  assert.equal(isHandheld({ userAgent: CHROME_LINUX, maxTouchPoints: 5, media: FINGER }), true);
});
