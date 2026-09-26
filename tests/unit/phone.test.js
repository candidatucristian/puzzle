import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import {
  CALLER_NAME, CALLER_NUMBER, PHONE_KEYMAP, createPhoneInput,
  pressPhoneKey, commitPhoneInput, phoneDisplay, decodeCallerNumber,
} from '../../src/levels/mobilephone/puzzle.js';

const type = (keys, state = createPhoneInput()) => [...keys].reduce(pressPhoneKey, state);

test('the displayed caller number and physical keypad both spell the accepted name', () => {
  assert.equal(CALLER_NUMBER, '(433)-666-777-433');
  assert.equal(decodeCallerNumber(CALLER_NUMBER), 'GEORGE');
  assert.equal(phoneDisplay(type('433666777433')), 'GEORGE');
  assert.equal(CALLER_NAME, LEVEL_METADATA.find(level => level.id === 'mobilephone').code);
});

test('repeated presses cycle each key and a commit allows consecutive letters on the same key', () => {
  for (const [key, letters] of Object.entries(PHONE_KEYMAP)) {
    for (let count = 1; count <= letters.length + 1; count++) {
      assert.equal(phoneDisplay(type(key.repeat(count))), letters[(count - 1) % letters.length]);
    }
  }
  assert.equal(phoneDisplay(type('2', commitPhoneInput(type('2')))), 'AA');
  assert.equal(phoneDisplay(type('23')), 'AD');
});

test('backspace deletes the pending letter; space commits it; the display shows the last twelve characters', () => {
  assert.equal(phoneDisplay(type('23#')), 'A');
  assert.equal(phoneDisplay(type('2*3')), 'A D');
  assert.equal(phoneDisplay(type('###')), '');
  let state = createPhoneInput();
  for (let i = 0; i < 14; i++) state = commitPhoneInput(pressPhoneKey(state, '2'));
  assert.equal(state.text.length, 14);
  assert.equal(phoneDisplay(state), 'A'.repeat(12));
});

test('input transitions preserve their previous state and ignore unknown keys', () => {
  const fresh = Object.freeze(createPhoneInput());
  const pending = Object.freeze(pressPhoneKey(fresh, '4'));
  assert.equal(phoneDisplay(fresh), '');
  assert.equal(phoneDisplay(commitPhoneInput(pending)), 'G');
  assert.equal(pending.pending, 'G');
  assert.equal(pressPhoneKey(pending, 'bad'), pending);
  assert.deepEqual(createPhoneInput(), fresh);
});
