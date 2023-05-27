import {UUID} from 'crypto';

import {Coords} from './Coords';

export enum CorridorVector {
  HORIZONTAL_LEFT,
  HORIZONTAL_RIGHT,
  VERTICAL_UP,
  VERTICAL_DOWN
}

export interface Corridor {
  id: UUID,
  startCoords: Coords,
  endCoords: Coords,
  vector: CorridorVector,
  width: number
  length: () => number
}

export const getCorridor = (
  startCoords: Corridor['startCoords'],
  endCoords: Corridor['endCoords'],
  vector: Corridor['vector'],
  width: Corridor['width'],
): Corridor => {
  const id = crypto.randomUUID();
  const length = () => {
    switch (vector) {
    case CorridorVector.HORIZONTAL_LEFT:
    case CorridorVector.HORIZONTAL_RIGHT:
      return Math.abs(_this.startCoords.x - _this.endCoords.x);
    case CorridorVector.VERTICAL_UP:
    case CorridorVector.VERTICAL_DOWN:
      return Math.abs(_this.startCoords.y - _this.endCoords.y);
    default:
      throw Error(`Unexpected corridor vector: "${_this.vector}".`);
    }
  };

  const _this = {
    id,
    startCoords,
    endCoords,
    vector,
    width,
    length,
  };

  return _this;
};
