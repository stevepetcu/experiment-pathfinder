import {Coords} from '../models/Coords';
import {GridCell} from '../models/SquareGrid';

export const calcManhattanDistance = (
  from: Coords | GridCell,
  to: Coords | GridCell,
) => {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
};

export const calcDiagonalDistance = (
  from: Coords | GridCell,
  to: Coords | GridCell,
) => {
  const deltaX = Math.abs(from.x - to.x);
  const deltaY = Math.abs(from.y - to.y);

  return Math.min(deltaX, deltaY) * Math.sqrt(2) + Math.abs(deltaX - deltaY);
};
