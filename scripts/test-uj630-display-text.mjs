import assert from 'node:assert/strict';
import { uj630DisplayText } from '../js/platform/uj630DisplayText.js';

for (const text of ['Café', 'Noël — 漢字 🎬', 'Discover', 'Déjà vu', 'Âge', 'Ã', 'é©']) {
  assert.equal(uj630DisplayText(text), text, 'Valid text remains unchanged');
}
const latin1 = text => Buffer.from(text, 'utf8').toString('latin1');
for (const text of ['Café', '\u200eDiscover', 'Cinéma 🎬', 'À suivre', 'Réalisateurs']) {
  assert.equal(uj630DisplayText(latin1(text)), text);
  assert.equal(uj630DisplayText(latin1(latin1(text))), text);
}
assert.equal(uj630DisplayText('CafÃ© / 漢字 🎬'), 'Café / 漢字 🎬', 'Mixed valid and broken text');
assert.equal(uj630DisplayText('â€ŽDiscover'), '\u200eDiscover', 'Windows-1252 directional mark');
assert.equal(uj630DisplayText('ðŸŽ¬ CinÃ©ma'), '🎬 Cinéma', 'Windows-1252 emoji');
assert.equal(uj630DisplayText('Ãx / âx'), 'Ãx / âx', 'Invalid byte sequences remain untouched');
assert.equal(uj630DisplayText(null), '');
const stored = { title: 'CafÃ©', id: 'CafÃ©', url: 'https://example.test/CafÃ©' };
const before = JSON.stringify(stored);
assert.equal(uj630DisplayText(stored.title), 'Café');
assert.equal(JSON.stringify(stored), before, 'Display repair is pure');
console.log('PASS display-only Latin-1/Windows-1252 repair, double encoding, mixed Unicode and immutable source data.');
