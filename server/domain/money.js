'use strict';

function parsePriceToAmount(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^Q\s*/i, '').replace(/,/g, '').replace(/\s/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function csvCell(value) {
  let safe = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

module.exports = { parsePriceToAmount, csvCell };
