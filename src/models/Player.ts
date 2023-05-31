import {AnimatedSprite, Graphics} from 'pixi.js';

import {CharacterTextureMap} from '../components/GridMapSquarePixi';
import randomInt from '../utils/RandomInt';
import {Coords} from './Coords';
import {CellStatus, Grid, GridCell} from './SquareGrid';

export interface Speed {
  px: number;
  ms: number;
}
export const DEFAULT_SPEED: Speed = {
  px: 20,
  ms: 300, // Lower is faster.
};

enum MovementDirection {
  // TODO: Implement directional combinations to use with Diagonal heuristics.
  N = 'north',
  NE = 'northeast',
  E = 'east',
  SE = 'southeast',
  S = 'south',
  SW = 'southwest',
  W = 'west',
  NW = 'northwest'
}

export interface Player {
  x: Coords['x'];
  y: Coords['y'];
  takePath: (path: GridCell[], isChangingDirection: boolean, speed?: Speed) => void;
  grid: Grid;
  isChangingDirection: boolean;
  movementState: {
    action: 'running' | 'lookingAround';
    direction: MovementDirection
  }
  playerSprite: AnimatedSprite;
  coordObservers: Graphics[];
}

// TODO: extract everything apart from the grid and starting coords into a createEffect on the parent.
export const getPlayer = (grid: Grid, startingCoords: Coords, playerSprite: AnimatedSprite,
  coordObservers: Graphics[] = [], characterTextures: CharacterTextureMap,
  gridScrollableContainer?: Element | null): Player => {

  const movementState: Player['movementState'] = {
    action: 'lookingAround',
    direction: MovementDirection.S,
  };

  const setTextures = (movementState?: Player['movementState'], playerSprite?: AnimatedSprite) => {
    const ps = playerSprite || _this.playerSprite;
    const ms = movementState || _this.movementState;
    // const fps = ms.action === 'running' ? 7 * 10 : 5 * 6; // has to be a multiple of the number of textures.

    const randomNr = randomInt(0, 9);
    const randomLookAroundSpeed = randomNr % 3 === 0 ? 5/200 :
      randomNr % 5 === 0 ? 5 / 150 :
        5/300; // TODO: use this later to offer an indication of when you're getting close to food.

    const fps = ms.action === 'running' ? 7/20 : randomLookAroundSpeed; // has to be a multiple of the number of textures.

    ps.textures = characterTextures[ms.action][ms.direction];
    ps.animationSpeed = fps;
    ps.play();
  };

  setTextures(movementState, playerSprite);

  const moveToCoords = (x: number, y:number, speed: Speed['px']) => {
    const vectorX = x - _this.x;
    const vectorY = y - _this.y;
    const direction = vectorX === 0 && vectorY === -1 ? MovementDirection.N :
      vectorX === 1 && vectorY === -1 ? MovementDirection.NE :
        vectorX === 1 && vectorY === 0 ? MovementDirection.E :
          vectorX === 1 && vectorY === 1 ? MovementDirection.SE :
            vectorX === 0 && vectorY === 1 ? MovementDirection.S :
              vectorX === -1 && vectorY === 1 ? MovementDirection.SW :
                vectorX === -1 && vectorY === 0 ? MovementDirection.W:
                  MovementDirection.NW;

    if (direction !== _this.movementState.direction || _this.movementState.action !== 'running') {
      _this.movementState.direction = direction;
      _this.movementState.action = 'running';
      setTextures();
    }

    _this.grid.setStatusForCellAt(CellStatus.VISITED, _this.x, _this.y);

    _this.x = x;
    _this.y = y;

    _this.grid.setStatusForCellAt(CellStatus.PLAYER, _this.x, _this.y);

    _this.playerSprite.x = _this.x * speed;
    _this.playerSprite.y = _this.y * speed;

    _this.coordObservers.map(co => {
      co.x += vectorX * speed;
      co.y += vectorY * speed;
    });

    gridScrollableContainer?.scroll({
      // TODO: Move this outta here!
      left: _this.x * speed - gridScrollableContainer?.clientWidth / 2,
      top: _this.y * speed - gridScrollableContainer?.clientHeight / 2,
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
      _this.movementState.action = 'lookingAround';
      setTextures();
      return;
    }

    if (isAt(nextStep)) {
      console.debug('Already at location.');
      _this.movementState.action = 'lookingAround';
      setTextures();
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
    movementState,
  };

  _this.grid.setStatusForCellAt(CellStatus.PLAYER, startingCoords.x, startingCoords.y);

  return _this;
};
