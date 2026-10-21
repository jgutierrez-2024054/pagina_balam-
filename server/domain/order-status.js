'use strict';

const nextStatuses = Object.freeze({
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['PAID', 'CANCELLED']),
  PAID: new Set(['DELIVERED']),
  CANCELLED: new Set(),
  DELIVERED: new Set()
});

function isValidOrderTransition(from, to) {
  return Boolean(nextStatuses[from]?.has(to));
}

function getNextOrderStatuses(status) {
  return [...(nextStatuses[status] || [])];
}

module.exports = { isValidOrderTransition, getNextOrderStatuses };
