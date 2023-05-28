import {Coords} from './Coords';
import {CellStatus, Grid, GridCell} from './SquareGrid';

export interface Player {
  x: Coords['x'];
  y: Coords['y'];
  takePath: (path: GridCell[]) => void;
  grid: Grid
}
export const getPlayer = (grid: Grid, startingCoords: Coords): Player => {
  grid.setStatusForCellAt(CellStatus.PLAYER, startingCoords.x, startingCoords.y);

  const moveToCoords = (x: number, y:number) => {
    grid.setStatusForCellAt(CellStatus.VISITED, _this.x, _this.y);

    _this.x = x;
    _this.y = y;

    grid.setStatusForCellAt(CellStatus.PLAYER, _this.x, _this.y);
  };

  const isAt = (cell: GridCell): boolean => {
    return _this.x === cell.x && _this.y === cell.y;
  };

  const takePath = async (path: GridCell[]): Promise<void> => {
    const nextStep = path.pop();
    console.debug('Next step: ', nextStep);

    if (nextStep === undefined) {
      console.debug('Unreachable, or reached position!');
      return;
    }

    if (isAt(nextStep)) {
      console.debug('Already at location.');
      return;
    }

    if (!nextStep.isEmpty()) {
      console.debug('Inaccessible cell.');
      return;
    }

    setTimeout(() => {
    // Add a pause to make the thing's movement perceptible to puny human eyes.
      moveToCoords(nextStep.x, nextStep.y);
      takePath(path);
    }, 50);
  };

  const _this = {
    x: startingCoords.x,
    y: startingCoords.y,
    takePath,
    grid,
  };

  return _this;
};
