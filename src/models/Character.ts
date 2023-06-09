import {UUID} from 'crypto';

import delay from '../utils/Delay';
import {calcVectorFromPointAToPointB} from '../utils/DistanceCalculator';
import {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {Coords} from './Coords';
import {Pathfinder} from './Pathfinder';
import { GridCell} from './SquareGrid';

export interface Speed {
  px: number;
  ms: number;
}
export const DEFAULT_SPEED: Speed = {
  px: 20, // Should be equal to the width of a grid cell.
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

export interface Character {
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
    speed: Speed;
  },
  isAlive: boolean;
  setIsAlive: (isAlive: boolean) => void;
  isActive: boolean; // TODO: a generic flag to use for critters and ghosts because I'm too lazy to do a better solution.
  setIsActive: (state: boolean) => void;
  willMeet: (otherCharacter: Character) => boolean;
  currentPath: GridCell[];
  stopMoving: () => void;
}

// TODO: rename this thing to "Character" and "getCharacter" etc.?
export const getCharacter = (pathfinder: Pathfinder, startingCoords: Coords,
  ssmb: SimpleSequenceMessageBroker): Character => {

  const id = crypto.randomUUID();

  const updateGameState = () => {
    ssmb.publish(_this);
  };

  const movementState: Character['movementState'] = {
    action: 'lookingAround',
    direction: MovementDirection.S,
    vectorX: 0,
    vectorY: 0,
    speed: DEFAULT_SPEED,
  };

  const isAt = (cell: GridCell): boolean => {
    return _this.x === cell.x && _this.y === cell.y;
  };

  const setIsAlive = (isAlive: boolean) => {
    _this.isAlive = isAlive;
    updateGameState();
  };

  const setIsActive = (state: boolean) => {
    _this.isActive = state;
    // updateGameState();
  };

  const willMeet = (otherCharacter: Character): boolean => {
    if (otherCharacter.movementState.action === 'lookingAround') {
      const otherCharCell = pathfinder.getGridCellAt(otherCharacter.x, otherCharacter.y);
      const result = _this.currentPath.includes(otherCharCell);

      if (result) {
        console.log('\nAVOIDED A SITTING CAT!\n' + Date.now());
      }

      return result;
    }

    if (_this.movementState.action === 'lookingAround') {
      const charCell = pathfinder.getGridCellAt(_this.x, _this.y); // TODO: extract a Character::getCell() method.
      const result = otherCharacter.currentPath.includes(charCell);

      if (result) {
        console.log('\nROAAAR!\n' + Date.now());
      }

      return result;
    }

    return false;

    // Both characters are moving; we need to figure out if they will meet in a cell.
    // To meet in any cell, the following conditions must be true:
    // 1. The character paths must share at least a cell - we'll search for the first shared cell from the end of their path arrays.
    // 2. If the character speeds were equal, we would check that the path index for the cells is equal, like so:
    //    _this.currentPath[meetupCellIndex] === otherCharacter.currentPath[meetupCellIndex]
    //    Given the character speeds are _not_ equal, we have to calculate whether they'll meet at the cell.

    // 1. Get the meetup cell index: this is the index in _this character's path.
    // const meetupCellIndex = _this.currentPath.findLastIndex(cell => otherCharacter.currentPath.includes(cell));
    //
    // if (meetupCellIndex < 0) {
    //   return false;
    // }
    //
    // // 2. Calculate the speed factor and whether they'll meet:
    // const speedFactor = _this.movementState.speed.ms/otherCharacter.movementState.speed.ms;
    // const otherCharMeetupCellIndex = otherCharacter.currentPath.lastIndexOf(_this.currentPath[meetupCellIndex]);
    //
    // const thisTimeFromCurrentCellToMeetupCell = (_this.currentPath.length - 1) - meetupCellIndex + 1;
    // const otherTimeFromCurrentCellToMeetupCell = (otherCharacter.currentPath.length - 1) - otherCharMeetupCellIndex + 1;
    //
    // // Attempt at a formula: time difference between reaching the common cell must be strictly smaller than
    // // the speed factor times the fastest speed.
    // const result = Math.abs(thisTimeFromCurrentCellToMeetupCell - otherTimeFromCurrentCellToMeetupCell) <
    //   speedFactor * Math.min(_this.movementState.speed.ms, otherCharacter.movementState.speed.ms);

    // console.log('HERE');
    // if (result) {
    //   console.log('\n\nTRUE::::' + Date.now());
    //   console.log(meetupCellIndex);
    //   console.log(_this.currentPath[meetupCellIndex], otherCharacter.currentPath[meetupCellIndex]);
    //   console.log(result);
    // } else {
    //   console.log('FALSE');
    // }


    // return result;
  };

  const moveToCoords = (x: number, y:number) => {
    const {vectorX, vectorY} = calcVectorFromPointAToPointB(
      {x, y},
      {x: _this.x, y: _this.y},
    );
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

  const stopMoving = () => {
    _this.isChangingDirection = true;
    _this.movementState.action = 'lookingAround';
    _this.movementState.vectorX = 0;
    _this.movementState.vectorY = 0;
    updateGameState();
  };

  const moveTo = async (cell: GridCell, speed = DEFAULT_SPEED) => {
    _this.movementState.speed = speed;

    _this.currentPath = pathfinder
      .tracePath(pathfinder.getGridCellAt(_this.x, _this.y), cell)
      .reverse();

    await takePath(_this.currentPath, true);
  };

  const takePath = async (path: GridCell[], isNewPath: boolean): Promise<void> => {
    await delay(_this.movementState.speed.ms);

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

    await takePath(path, false);
  };

  // TODO: refactor models – most of them don't need a _this (unless I need to call another object on _this object).
  const currentPath: GridCell[] = [];
  const _this = {
    id,
    x: startingCoords.x,
    y: startingCoords.y,
    moveTo,
    pathfinder,
    isChangingDirection: false,
    movementState,
    isAlive: true,
    setIsAlive,
    isActive: false,
    setIsActive,
    willMeet,
    currentPath,
    stopMoving,
  };

  updateGameState();

  return _this;
};
