import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { MORSE, buildMorseSteps } from '../../src/levels/lightswitch/puzzle.js';
import { MODEM_WORD, planTransmission } from '../../src/levels/modem/puzzle.js';

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
  let bits = '', decoded = '', count = 0;
  for (const event of events) {
    if (event.state === 'green') bits += event.led === 5 ? '0' : '1';
    if (event.state === 'red') {
      assert.equal(bits.length, 8);
      assert.equal(event.led, count++);
      decoded += String.fromCharCode(parseInt(bits, 2));
      bits = '';
    }
  }
  assert.equal(decoded, 'HTTPS');
  assert.equal(decoded, MODEM_WORD);
  assert.equal(decoded, LEVEL_METADATA.find(level => level.id === 'modem').code);
});

test('Modem timing preserves the readable bits, letter counters and repeat pause', () => {
  const { events, duration } = planTransmission();
  assert.equal(events.length, 85);
  assert.equal(events[0].at, 500);
  assert.equal(events[1].at, 1100);
  assert.equal(events[2].at, 1430);
  assert.deepEqual(events.filter(event => event.state === 'red').map(event => event.at),
    [8110, 16570, 25030, 33490, 41950]);
  assert.equal(duration, 46300);
  for (let i = 1; i < events.length; i++) assert.ok(events[i].at > events[i - 1].at);
});
