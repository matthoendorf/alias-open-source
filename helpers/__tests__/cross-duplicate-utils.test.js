const { divideArray } = require('../cross-duplicate-utils');

describe('divideArray', () => {
  test('returns empty array when input is empty and m is 0', () => {
    expect(divideArray([], 0)).toEqual([]);
  });
});
