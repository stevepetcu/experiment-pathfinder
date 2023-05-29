import * as PIXI from 'pixi.js';

import {Coords} from './Coords';
import {CellStatus, Grid, GridCell} from './SquareGrid';

export interface Speed {
  px: number;
  ms: number;
}
export const DEFAULT_SPEED: Speed = {
  px: 20,
  ms: 50,
};

export interface Player {
  x: Coords['x'];
  y: Coords['y'];
  takePath: (path: GridCell[], isChangingDirection: boolean, speed?: Speed) => void;
  grid: Grid;
  isChangingDirection: boolean;
  playerSprite: PIXI.Sprite;
  coordObservers: PIXI.Graphics[];
}
export const getPlayer = (grid: Grid, startingCoords: Coords, playerSprite: PIXI.Sprite,
  coordObservers: PIXI.Graphics[] = []): Player => {
  const moveToCoords = (x: number, y:number, speed: Speed['px']) => {
    _this.grid.setStatusForCellAt(CellStatus.VISITED, _this.x, _this.y);

    const vectorX = x - _this.x;
    const vectorY = y - _this.y;

    _this.x = x;
    _this.y = y;

    _this.grid.setStatusForCellAt(CellStatus.PLAYER, _this.x, _this.y);

    _this.playerSprite.x = _this.x * speed;
    _this.playerSprite.y = _this.y * speed;

    _this.coordObservers.map(co => {
      co.x += vectorX * speed;
      co.y += vectorY * speed;
    });

    window.scroll({
      // TODO: Move this outta here!
      left: playerSprite.x,
      top: playerSprite.y,
      behavior: 'auto',
    });
  };

  const isAt = (cell: GridCell): boolean => {
    return _this.x === cell.x && _this.y === cell.y;
  };

  const takePath = async (path: GridCell[], isNewPath: boolean, speed = DEFAULT_SPEED): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, speed.ms));

    if (isNewPath) {
      _this.isChangingDirection = false;
    }

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

    if (_this.isChangingDirection && !isNewPath) {
      return;
    }

    // setTimeout(() => {
    moveToCoords(nextStep.x, nextStep.y, speed.px);
    // Add a pause to make the thing's movement perceptible to puny human eyes.
    // await new Promise(resolve => setTimeout(resolve, 50));

    await takePath(path, false, speed);
    // }, 50);
  };

  const _this = {
    x: startingCoords.x,
    y: startingCoords.y,
    takePath,
    grid,
    isChangingDirection: false,
    playerSprite,
    coordObservers,
  };

  _this.grid.setStatusForCellAt(CellStatus.PLAYER, startingCoords.x, startingCoords.y);

  return _this;
};
