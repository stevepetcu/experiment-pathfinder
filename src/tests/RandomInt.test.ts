import {describe, expect, jest, test} from '@jest/globals';

import randomInt from '../utils/RandomInt';

describe('RandomInt', () => {
  test('returns an integer with a value between "min" inclusive and "max" exclusive', () => {
    const min = randomInt(-99999, 0);
    const max = randomInt(0, 99999);
    const number = randomInt(min, max);

    expect(Number.isInteger(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(min);
    expect(number).toBeLessThan(max);
  });

  test('returns an integer equal to what was passed in when "min" === "max"', () => {
    const min = randomInt(-99999, 99999);
    const number = randomInt(min, min);

    expect(number).toBe(min);
  });

  test('returns the same result regardless of the order of "min" and "max"', () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);

    const min = randomInt(-99999, 0);
    const max = randomInt(0, 99999);
    const randomIntSaneParamOrder = randomInt(min, max);
    const randomIntInsaneParamOrder = randomInt(max, min);

    expect(randomIntSaneParamOrder).toBe(randomIntInsaneParamOrder);
  });
});
