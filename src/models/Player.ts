import {UUID} from 'crypto';

import {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {Coords} from './Coords';
import {Pathfinder} from './Pathfinder';
import { GridCell} from './SquareGrid';

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
  id: UUID,
  x: Coords['x'];
  y: Coords['y'];
  moveTo: (cell: GridCell, speed: Speed) => void;
  pathfinder: Pathfinder;
  isChangingDirection: boolean;
  movementState: {
    action: 'running' | 'lookingAround';
    direction: MovementDirection;
    vectorX: number;
    vectorY: number;
  },
  isAlive: boolean
}

// TODO: rename this thing to "Character" and "getCharacter" etc.?
export const getPlayer = (pathfinder: Pathfinder, startingCoords: Coords,
  ssmb: SimpleSequenceMessageBroker): Player => {

  const id = crypto.randomUUID();

  const updateGameState = () => {
    ssmb.publish({
      id: _this.id,
      movementState: _this.movementState,
      x: _this.x,
      y: _this.y,
      isAlive: _this.isAlive,
    });
  };

  const movementState: Player['movementState'] = {
    action: 'lookingAround',
    direction: MovementDirection.S,
    vectorX: 0,
    vectorY: 0,
  };

  const moveToCoords = (x: number, y:number) => {
    const vectorX = x - _this.x;
    const vectorY = y - _this.y;
    _this.movementState.vectorX = vectorX;
    _this.movementState.vectorY = vectorY;

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
    }

    _this.x = x;
    _this.y = y;

    updateGameState();
  };

  const isAt = (cell: GridCell): boolean => {
    return _this.x === cell.x && _this.y === cell.y;
  };

  const stopMoving = () => {
    _this.movementState.action = 'lookingAround';
    _this.movementState.vectorX = 0;
    _this.movementState.vectorY = 0;
    updateGameState();
  };

  const moveTo = async (cell: GridCell, speed = DEFAULT_SPEED) => {
    const path = pathfinder
      .tracePath(pathfinder.getGridCellAt(_this.x, _this.y), cell)
      .reverse();

    await takePath(path, true, speed);
  };

  const takePath = async (path: GridCell[], isNewPath: boolean, speed: Speed): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, speed.ms));

    if (isNewPath) {
      _this.isChangingDirection = false;
    }

    const nextStep = path.pop();
    console.debug('Next step: ', nextStep);

    if (nextStep === undefined) {
      console.debug('Unreachable, or reached position!');
      stopMoving();
      return;
    }

    if (isAt(nextStep)) {
      console.debug('Already at location.');
      stopMoving();
      return;
    }

    if (!nextStep.isAccessible()) {
      console.debug('Inaccessible cell.');
      stopMoving();
      return;
    }

    if (_this.isChangingDirection && !isNewPath) {
      return;
    }

    moveToCoords(nextStep.x, nextStep.y);

    await takePath(path, false, speed);
  };

  // TODO: refactor models – most of them don't need a _this (unless I need to call another object on _this object).
  const _this = {
    id,
    x: startingCoords.x,
    y: startingCoords.y,
    moveTo,
    pathfinder,
    isChangingDirection: false,
    movementState,
    isAlive: true,
  };

  updateGameState();

  return _this;
};
