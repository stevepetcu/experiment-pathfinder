export const fixEdgeUuidFormat = (uuid: string): string => {
  if (uuid.length === 36) {
    return uuid;
  }

  return uuid.slice(0, 23) + '-' + uuid.slice(23);
};
