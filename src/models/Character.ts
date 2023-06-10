import {UUID} from 'crypto';

import delay from '../utils/Delay';
import {calcVectorFromPointAToPointB} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {Coords} from './Coords';
import {Pathfinder} from './Pathfinder';
import {CellStatus, GridCell} from './SquareGrid';

export interface Speed {
  px: number;
  ms: number;
}
export const DEFAULT_SPEED: Speed = {
  px: 20, // Should be equal to the width of a grid cell.
  ms: 300, // Lower is faster.
};

export enum MovementDirection {
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
  moveTo: (cell: GridCell, speed: Speed, avoidCell?: GridCell) => void;
  moveAwayFrom: (coords: Coords, speed: Speed) => void; // TODO: refactor these methods so they're more consistent w/ each other.
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
  isTriggered: boolean; // TODO: a generic flag to use for critters and ghosts because I'm too lazy to do a better solution.
  setIsTriggered: (state: boolean) => void;
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

  const setIsTriggered = (state: boolean) => {
    _this.isTriggered = state;
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

    // Don't handle both characters moving.
    return false;
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

  const moveTo = async (cell: GridCell, speed = DEFAULT_SPEED, avoidCell?: GridCell) => {
    // TODO: move isChangingDirection = true here?
    _this.movementState.speed = speed;

    _this.currentPath = pathfinder
      .tracePath(
        pathfinder.getGridCellAt(_this.x, _this.y),
        cell,
        avoidCell,
      )
      .reverse();

    await takePath(_this.currentPath, true);
  };

  const moveAwayFrom = async (coords: Coords, speed = DEFAULT_SPEED) => {
    const vectorTowardsOtherPoint = calcVectorFromPointAToPointB(
      {x: _this.x, y: _this.y},
      {x: coords.x, y: coords.y},
    );

    let i = 3;
    let j = 5;
    let moveDistance = randomInt(i, j);
    let cellToMoveTo = pathfinder.getGridCellAt(
      Math.sign(vectorTowardsOtherPoint.vectorX) * moveDistance + _this.x,
      Math.sign(vectorTowardsOtherPoint.vectorY) * moveDistance + _this.y,
    );

    while (cellToMoveTo.status === CellStatus.OUT_OF_BOUNDS) {
      if (i === 0 && j === 0) {
        stopMoving();
        return;
      }

      if (i > 0) {
        i--;
      }
      if (j > 0) {
        j--;
      }

      moveDistance = randomInt(i, j);
      cellToMoveTo = pathfinder.getGridCellAt(
        Math.sign(vectorTowardsOtherPoint.vectorX) * moveDistance + _this.x,
        Math.sign(vectorTowardsOtherPoint.vectorY) * moveDistance + _this.y,
      );
    }

    await moveTo(cellToMoveTo, speed);
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
    isTriggered: false,
    setIsTriggered,
    willMeet,
    currentPath,
    stopMoving,
    moveAwayFrom,
  };

  updateGameState();

  return _this;
};
