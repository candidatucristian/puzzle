import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { MORSE, buildMorseSteps } from '../../src/levels/lightswitch/puzzle.js';
import { MODEM_WORD, BYTE_LEDS, planTransmission } from '../../src/levels/modem/puzzle.js';

test('each Lightswitch press displays one complete Morse letter of the accepted answer', () => {
  const word = LEVEL_METADATA.find(level => level.id === 'lightswitch').code;
  const patterns = [...word].map(letter => buildMorseSteps(letter)
    .filter(step => step.on).map(step => step.dur === 40 ? '.' : '-').join(''));
  assert.deepEqual(patterns, ['.--.', '---', '.--', '.', '.-.']);
  assert.equal(patterns.map(pattern => Object.keys(MORSE).find(key => MORSE[key] === pattern)).join(''), word);
});

test('Morse retains its flash lengths and spacing without a trailing pause', () => {
  assert.deepEqual(buildMorseSteps('et'), [
    { on: true, dur: 40 }, { on: false, dur: 780 }, { on: true, dur: 500 },
  ]);
  assert.deepEqual(buildMorseSteps('i'), [
    { on: true, dur: 40 }, { on: false, dur: 384 }, { on: true, dur: 40 },
  ]);
  assert.deepEqual(buildMorseSteps(''), []);
});

test('Modem LED flashes decode to HTTPS, with one red counter after each byte', () => {
  const { events } = planTransmission();
  const lit = new Set();
  let decoded = '', count = 0;
  for (const event of events) {
    if (event.state === 'green') lit.add(event.led);
    if (event.state === 'red') {
      const bits = BYTE_LEDS.map(led => (lit.has(led) ? '1' : '0')).join('');
      assert.equal(bits.length, 7);
      assert.equal(event.led, count++);
      decoded += String.fromCharCode(parseInt(bits, 2));
      lit.clear();
    }
  }
  assert.equal(decoded, 'HTTPS');
  assert.equal(decoded, MODEM_WORD);
  assert.equal(decoded, LEVEL_METADATA.find(level => level.id === 'modem').code);
});

test('Modem timing preserves the readable bits, letter counters and repeat pause', () => {
  const { events, duration } = planTransmission();
  assert.equal(events.length, 54);
  assert.equal(events[0].at, 700);
  assert.equal(events[1].at, 910);
  assert.equal(events[2].at, 3990);
  assert.deepEqual(events.filter(event => event.state === 'red').map(event => event.at),
    [4440, 9080, 13720, 18360, 23000]);
  assert.equal(duration, 27400);
  for (let i = 1; i < events.length; i++) assert.ok(events[i].at >= events[i - 1].at);
});
