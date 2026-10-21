'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidOrderTransition, getNextOrderStatuses } = require('../server/domain/order-status');
const { parsePriceToAmount, csvCell } = require('../server/domain/money');

test('order transitions follow the expected lifecycle', () => {
  assert.equal(isValidOrderTransition('PENDING', 'CONFIRMED'), true);
  assert.equal(isValidOrderTransition('CONFIRMED', 'PAID'), true);
  assert.equal(isValidOrderTransition('PENDING', 'PAID'), false);
  assert.equal(isValidOrderTransition('PAID', 'CANCELLED'), false);
  assert.deepEqual(getNextOrderStatuses('CANCELLED'), []);
});

test('GTQ price parser accepts whole quetzales and rejects malformed input', () => {
  assert.equal(parsePriceToAmount('Q3,500'), 3500);
  assert.equal(parsePriceToAmount(' 1200 '), 1200);
  assert.equal(parsePriceToAmount('-20'), null);
  assert.equal(parsePriceToAmount('Q12.50'), null);
  assert.equal(parsePriceToAmount('no es un precio'), null);
});

test('CSV cells quote content and neutralize spreadsheet formulas', () => {
  assert.equal(csvCell('Ana, "Artista"'), '"Ana, ""Artista"""');
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
});
