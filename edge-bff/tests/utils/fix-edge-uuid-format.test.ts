import {describe, expect, test} from '@jest/globals';

import {fixEdgeUuidFormat} from '../../utils/fix-edge-uuid-format';

describe('fix-edge-uuid-format', () => {
  const properlyFormattedUUID = '53f43abd-ed3d-4f4f-14c3-b0f1b8e4aa5d';

  test('returns a correctly formatted UUID when passed in an "edge-format UUID"', () => {
    const badlyFormattedUUID = '53f43abd-ed3d-4f4f-14c3b0f1b8e4aa5d';

    expect(fixEdgeUuidFormat(badlyFormattedUUID)).toBe(properlyFormattedUUID);
  });

  test('returns the value that was passed in when it was already formatted properly', () => {
    expect(fixEdgeUuidFormat(properlyFormattedUUID)).toBe(properlyFormattedUUID);
    expect(false).toBe(true);
  });
});
