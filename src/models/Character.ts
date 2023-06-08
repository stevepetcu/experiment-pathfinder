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
  },
  isAlive: boolean;
  setIsAlive: (isAlive: boolean) => void;
  isActive: boolean; // TODO: a generic flag to use for critters and ghosts because I'm too lazy to do a better solution.
  triggerIsActive: () => void;
  willMeet: (otherCharacter: Character) => boolean;
  currentPath: GridCell[]
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
  };

  const isAt = (cell: GridCell): boolean => {
    return _this.x === cell.x && _this.y === cell.y;
  };

  const setIsAlive = (isAlive: boolean) => {
    _this.isAlive = isAlive;
    updateGameState();
  };

  const triggerIsActive = () => {
    if (!_this.isActive) {
      _this.isActive = true;
      updateGameState();
    }

    setTimeout(() => {
      _this.isActive = false;
    }, 1500);
  };

  const willMeet = (otherCharacter: Character): boolean => {
    const meetupCell = _this.currentPath.find(cell => otherCharacter.currentPath.includes(cell));

    if (!meetupCell) {
      return false;
    }

    const critterIndexOfMeetupCell = _this.currentPath.indexOf(meetupCell);
    const otherCharIndexOfMeetupCell = otherCharacter.currentPath.indexOf(meetupCell);

    // Return false if the paths don't intersect at the same time or if there's more than 2 blocks until they intersect.
    return !(critterIndexOfMeetupCell !== otherCharIndexOfMeetupCell
      || _this.currentPath.length - critterIndexOfMeetupCell > 3);
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
    _this.movementState.action = 'lookingAround';
    _this.movementState.vectorX = 0;
    _this.movementState.vectorY = 0;
    updateGameState();
  };

  const moveTo = async (cell: GridCell, speed = DEFAULT_SPEED) => {
    _this.currentPath = pathfinder
      .tracePath(pathfinder.getGridCellAt(_this.x, _this.y), cell)
      .reverse();

    await takePath(_this.currentPath, true, speed);
  };

  const takePath = async (path: GridCell[], isNewPath: boolean, speed: Speed): Promise<void> => {
    await delay(speed.ms);

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
    triggerIsActive,
    willMeet,
    currentPath,
  };

  updateGameState();

  return _this;
};
