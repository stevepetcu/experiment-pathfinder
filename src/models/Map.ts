import randomInt from '../utils/RandomInt';
import {Coords} from './Coords';
import {Corridor, CorridorVector, getCorridor} from './Corridor';
import {getRoom, Room} from './Room';

export const MAP_BORDER_THICKNESS = 2;
const MIN_ROOM_ASPECT_RATIO = 1.6; // 16:10 aspect ratio
const GRID_SPACE_UTILISATION_ITERATIVE_DECREASE = 0.01;
const MIN_GRID_SPACE_UTILISATION = 0.5; // Use at least this % of the grid for room space
const LEVEL_ONE_ITERATION_COUNT_THRESHOLD = 10000;
const LEVEL_TWO_ITERATION_COUNT_THRESHOLD = LEVEL_ONE_ITERATION_COUNT_THRESHOLD * 10;
const MAGIC_TO_REPLACE_LATER = 333;
const CORRIDOR_REMOVAL_BASE_CHANCE = 10;

const MAX_RETRIES_ALLOWED_TO_GENERATE_RANDOM_POINTS = 10;

export const generateRandomCoordsInRandomRoom = (
  rooms: Room[],
  avoidPoint?: Coords,
  numberOfTries?: number,
): Coords => {
  let tries = numberOfTries ?? 0;
  if (tries === MAX_RETRIES_ALLOWED_TO_GENERATE_RANDOM_POINTS) {
    return {
      x: -1,
      y: -1,
    };
  }

  const randomRoom = rooms[randomInt(0, rooms.length)];

  const x = randomInt(randomRoom.leftX(), randomRoom.rightX() + 1); // randomInt max is exclusive
  const y = randomInt(randomRoom.topY(), randomRoom.bottomY() + 1); // randomInt max is exclusive

  if (avoidPoint && x === avoidPoint.x && y === avoidPoint.y) {
    tries++;
    return generateRandomCoordsInRandomRoom(rooms, avoidPoint, tries);
  }

  return {x, y};
};

export const generateRandomCoordsAwayFromRoom = (
  rooms: Room[],
  currentRoom: Room,
  pointToGetAwayFrom: Coords,
  directionToEscapeTo: {vectorX: number, vectorY: number},
): Coords => {
  let availableRooms: Room[] = rooms;

  if (directionToEscapeTo.vectorX < 0) {
    // Go left.
    availableRooms = rooms.filter(r => r.rightX() <= currentRoom.leftX());
  } else if (directionToEscapeTo.vectorX > 0) {
    // Go right.
    availableRooms = rooms.filter(r => r.leftX() >= currentRoom.rightX());
  } else if (directionToEscapeTo.vectorX === 0 && directionToEscapeTo.vectorY < 0) {
    // Go up.
    availableRooms = rooms.filter(r => r.bottomY() <= currentRoom.topY());
  } else if (directionToEscapeTo.vectorX === 0 && directionToEscapeTo.vectorY > 0) {
    // Go down.
    availableRooms = rooms.filter(r => r.topY() >= currentRoom.bottomY());
  }

  if (availableRooms.length === 0) {
    return generateRandomCoordsInRandomRoom(rooms, pointToGetAwayFrom);
  }

  const randomRoom = availableRooms[randomInt(0, availableRooms.length)];

  const x = randomInt(randomRoom.leftX(), randomRoom.rightX() + 1); // randomInt max is exclusive
  const y = randomInt(randomRoom.topY(), randomRoom.bottomY() + 1); // randomInt max is exclusive

  return {x, y};
};

export const generateRandomCoordsAwayFromCorridor = (
  rooms: Room[],
  corridor: Corridor,
  pointToGetAwayFrom: Coords,
  directionToEscapeTo: {vectorX: number, vectorY: number},
): Coords => {
  let availableRooms: Room[] = rooms;

  if (directionToEscapeTo.vectorX < 0) {
    // Go left. Up or down should not be possible anyway.
    if (corridor.vector === CorridorVector.HORIZONTAL_RIGHT) {
      availableRooms = rooms.filter(r => r.rightX() <= corridor.startCoords.x);
    } else if (corridor.vector === CorridorVector.HORIZONTAL_LEFT) {
      availableRooms = rooms.filter(r => r.rightX() <= corridor.endCoords.x);
    }
  } else if (directionToEscapeTo.vectorX > 0) {
    // Go right. Up or down should not be possible anyway.
    if (corridor.vector === CorridorVector.HORIZONTAL_RIGHT) {
      availableRooms = rooms.filter(r => r.leftX() >= corridor.endCoords.x);
    } else if (corridor.vector === CorridorVector.HORIZONTAL_LEFT) {
      availableRooms = rooms.filter(r => r.leftX() >= corridor.startCoords.x);
    }
  } else if (directionToEscapeTo.vectorX === 0 && directionToEscapeTo.vectorY < 0) {
    // Go up. Left or right should not be possible anyway.
    if (corridor.vector === CorridorVector.VERTICAL_UP) {
      availableRooms = rooms.filter(r => r.bottomY() <= corridor.endCoords.y);
    } else if (corridor.vector === CorridorVector.VERTICAL_DOWN) {
      availableRooms = rooms.filter(r => r.bottomY() <= corridor.startCoords.y);
    }
  } else if (directionToEscapeTo.vectorX === 0 && directionToEscapeTo.vectorY > 0) {
    // Go down. Left or right should not be possible anyway.
    if (corridor.vector === CorridorVector.VERTICAL_UP) {
      availableRooms = rooms.filter(r => r.topY() >= corridor.startCoords.y);
    } else if (corridor.vector === CorridorVector.VERTICAL_DOWN) {
      availableRooms = rooms.filter(r => r.topY() >= corridor.endCoords.y);
    }
  }

  if (availableRooms.length === 0) {
    return generateRandomCoordsInSpecificCorridor(corridor, pointToGetAwayFrom);
  }

  const randomRoom = availableRooms[randomInt(0, availableRooms.length)];

  const x = randomInt(randomRoom.leftX(), randomRoom.rightX() + 1); // randomInt max is exclusive
  const y = randomInt(randomRoom.topY(), randomRoom.bottomY() + 1); // randomInt max is exclusive

  return {x, y};
};

export const generateRandomCoordsInSpecificRoom = (
  room: Room,
  avoidPoint?: Coords,
  numberOfTries?: number,
): Coords => {
  let tries = numberOfTries ?? 0;
  if (tries === MAX_RETRIES_ALLOWED_TO_GENERATE_RANDOM_POINTS) {
    return {
      x: -1,
      y: -1,
    };
  }

  const x = randomInt(room.leftX(), room.rightX() + 1); // randomInt max is exclusive
  const y = randomInt(room.topY(), room.bottomY() + 1); // randomInt max is exclusive

  if (avoidPoint && x === avoidPoint.x && y === avoidPoint.y) {
    tries++;
    return generateRandomCoordsInSpecificRoom(room, avoidPoint, tries);
  }

  return {x, y};
};

export const generateRandomCoordsInSpecificCorridor = (
  corridor: Corridor,
  avoidPoint?: Coords,
  numberOfTries?: number,
): Coords => {
  let tries = numberOfTries ?? 0;
  if (tries === MAX_RETRIES_ALLOWED_TO_GENERATE_RANDOM_POINTS) {
    return {
      x: -1,
      y: -1,
    };
  }

  const x = randomInt(corridor.startCoords.x, corridor.endCoords.x + 1); // randomInt max is exclusive
  const y = randomInt(corridor.startCoords.y, corridor.endCoords.y + 1); // randomInt max is exclusive

  if (avoidPoint && x === avoidPoint.x && y === avoidPoint.y) {
    tries++;
    return generateRandomCoordsInSpecificCorridor(corridor, avoidPoint, tries);
  }

  return {x, y};
};

export const generateRooms = async (
  mapWidth: number,
  minRoomWidth: number,
  maxRoomWidth: number,
  minDistanceBetweenRooms: number,
): Promise<Room[]> => {
  const usefulGridArea = (mapWidth - 2 * MAP_BORDER_THICKNESS) * (mapWidth - 2 * MAP_BORDER_THICKNESS);
  const rooms: Room[] = [];

  let totalAreaInAndAroundRooms = 0;
  let roomIterationCount = 0;
  let hasLevelOneInfiniteLoopPreventativeActionBeenTaken = false;
  let gridSpaceUtilisationCoefficient = 1.0;
  let maxRel = maxRoomWidth; //TODO: rename

  roomGenerationLoop:
  while (totalAreaInAndAroundRooms < gridSpaceUtilisationCoefficient * usefulGridArea) {
    const roomWidth = randomInt(minRoomWidth, maxRel + 1);
    const roomHeight = randomInt(minRoomWidth, maxRel + 1);

    if (Math.max(roomWidth, roomHeight) / Math.min(roomWidth, roomHeight) > MIN_ROOM_ASPECT_RATIO) {
      continue;
    }

    const randomTopLeft: Coords = {
      x: randomInt(MAP_BORDER_THICKNESS, mapWidth - MAP_BORDER_THICKNESS - roomWidth),
      y: randomInt(MAP_BORDER_THICKNESS, mapWidth - MAP_BORDER_THICKNESS - roomHeight),
    };

    const room = getRoom(randomTopLeft, roomWidth, roomHeight);

    if (rooms.length > 0) {
      for (let i = 0; i < rooms.length; i++) {
        if (room.isOverlapping(rooms[i])) {
          roomIterationCount++;
          if (roomIterationCount > LEVEL_ONE_ITERATION_COUNT_THRESHOLD
              && !hasLevelOneInfiniteLoopPreventativeActionBeenTaken) {
            gridSpaceUtilisationCoefficient = Math.max(
              gridSpaceUtilisationCoefficient - GRID_SPACE_UTILISATION_ITERATIVE_DECREASE,
              MIN_GRID_SPACE_UTILISATION,
            );
          }

          if (roomIterationCount > LEVEL_TWO_ITERATION_COUNT_THRESHOLD
              && hasLevelOneInfiniteLoopPreventativeActionBeenTaken) {
            maxRel = Math.max(maxRel - 1, minRoomWidth + 1);
            roomIterationCount = 0;
            hasLevelOneInfiniteLoopPreventativeActionBeenTaken = false;
          }
          continue roomGenerationLoop;
        }
      }
    }

    rooms.push(room);
    totalAreaInAndAroundRooms += room.withClearance(minDistanceBetweenRooms).area();
  }

  return rooms;
};

const disconnectedRooms = (rooms: Room[]): Room[] => {
  if (rooms.length < 1) {
    return [];
  }

  rooms.forEach(it => it.unVisit()); // Just resetting the status.

  const queue: Room[] = [];
  queue.push(rooms[0]);

  while (queue.length > 0) {
    const room = queue.shift();
    if (!(room!.isVisited)) {
      queue.push(...room!.visit());
    }
  }

  return rooms.filter(it => !it.isVisited);
};

export const generateCorridors = async (rooms: Room[], mapWidth: number): Promise<Corridor[]> => {
  const corridors: Corridor[] = [];

  const comparator = (first: Room, second: Room) => {
    const yDifference = first.topY() - second.topY();

    return yDifference === 0 ? first.leftX() - second.leftX() : yDifference;
  };

  const sortedRooms = rooms.sort(comparator);

  corridors.push(...generateCorridorsHorizontallyRight(sortedRooms, mapWidth));
  corridors.push(...generateCorridorsVerticallyUp(sortedRooms));

  if (disconnectedRooms(rooms).length > 0) {
    // TODO: use disconnectedRooms(sortedRooms)??
    const disconnectedNodes = rooms.filter(it => it.connectedRooms.length === 0);

    corridors.push(...generateCorridorsHorizontallyRight(
      disconnectedNodes, mapWidth, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
    ));

    corridors.push(...generateCorridorsVerticallyUp(
      disconnectedNodes, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
    ));

    corridors.push(...generateCorridorsVerticallyDown(
      disconnectedNodes, mapWidth, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
    ));

    if (disconnectedRooms(rooms).length > 0) {
      // TODO: did I mean to do disconnectedRooms(disconnectedNodes) here??
      const disconnectedLeaves = rooms.filter(it => it.connectedRooms.length === 1);

      corridors.push(...generateCorridorsHorizontallyRight(
        disconnectedLeaves, mapWidth, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
      ));

      corridors.push(...generateCorridorsVerticallyUp(
        disconnectedLeaves, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
      ));

      corridors.push(...generateCorridorsHorizontallyLeft(
        disconnectedLeaves, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
      ));

      corridors.push(...generateCorridorsVerticallyDown(
        disconnectedLeaves, mapWidth, 3, MAGIC_TO_REPLACE_LATER, sortedRooms,
      ));
    }
  }

  /**
   * Reduce the number of corridors:
   */
  for (let i = 0; i < rooms.length; i++) {
    // TODO: use sorted rooms?
    const currentRoom = rooms[i];

    if (currentRoom.connectedRooms.length > 2) {
      currentRoom.connectedRooms.sort(
        // Sort desc based on corridor length b/c longer corridors get removed first.
        (first, second) => second.corridor.length() - first.corridor.length(),
      );

      for (let j = 0; j < currentRoom.connectedRooms.length; j++) {
        const currentConnection = currentRoom.connectedRooms[j];
        const connectedRoom = currentConnection.room;

        if (connectedRoom.connectedRooms.length < 2) {
          continue;
        }

        const rng = randomInt(1, 101);
        const connectedCorridor = currentConnection.corridor;

        if (rng < CORRIDOR_REMOVAL_BASE_CHANCE * connectedCorridor.length()) {
          connectedRoom.disconnectFrom(currentRoom);
          currentRoom.connectedRooms.splice(j, 1); // TODO: use disconnect from and also move the above into it, to disconnect both sides?
          if (disconnectedRooms(rooms).length > 0) {
            // Removing this corridor resulted in a disconnected graph. Undoing…
            currentRoom.connectedRooms.splice(j, 0,currentConnection);
            connectedRoom.connectTo(currentRoom, connectedCorridor);
          } else {
            j--; // Decrement j because we spliced earlier.
            const corridorIndex = corridors.findIndex(it => it.id === connectedCorridor.id);
            corridors.splice(corridorIndex, 1);
          }
        }
      }
    }
  }
  /**
   * End: Reduce the number of corridors.
   */

  return corridors;
};

/**
 * Corridor generations stuff below:
 */

const generateCorridorsHorizontallyRight = (
  sortedRooms: Room[],
  mapWidth: number,
  iterationStartModifier = 2,
  iterationEndModifier = 3,
  allRooms: Room[] = [],
): Corridor[] => {
  const allTheRooms = allRooms.length > 0 ? allRooms : sortedRooms;
  const corridors = [];

  for (let i = 0; i < sortedRooms.length; i++) {
    // TODO: why not use allTheRooms?
    const currentRoom = sortedRooms[i];
    let row = currentRoom.topY();
    const iterationStart = currentRoom.rightX() + iterationStartModifier;

    if (iterationStart >= mapWidth - MAP_BORDER_THICKNESS) {
      continue; // The room's next to the border of the map.
    }

    const iterationEnd = Math.min(
      currentRoom.rightX() + iterationEndModifier,
      mapWidth - MAP_BORDER_THICKNESS,
    );

    while (row <= currentRoom.bottomY()) {
      let col = iterationStart;

      while (col <= iterationEnd) {
        const point: Coords = {x: col, y: row};
        const otherRoom = allTheRooms.find(it => it.contains(point));

        if (otherRoom) {
          if (otherRoom.isConnectedTo(currentRoom)) {
            break;
          }

          const absoluteLowerCorridorLimit = Math.min(currentRoom.bottomY(), otherRoom.bottomY());
          const corridorHorizontalBounds = {first: currentRoom.rightX(), second: otherRoom.leftX()};
          const corridorVerticalBounds = {first: point.y, second: absoluteLowerCorridorLimit};

          const corridorYPosition = corridorVerticalBounds.first !== corridorVerticalBounds.second ?
            randomInt(corridorVerticalBounds.first, corridorVerticalBounds.second) :
            corridorVerticalBounds.first;

          const corridorStartingCoords: Coords = {x: corridorHorizontalBounds.first, y: corridorYPosition};
          const corridorEndingCoords: Coords = {x: corridorHorizontalBounds.second, y: corridorYPosition};

          const corridor = getCorridor(
            corridorStartingCoords,
            corridorEndingCoords,
            CorridorVector.HORIZONTAL_RIGHT,
            1,
          );

          corridors.push(corridor);
          currentRoom.connectTo(otherRoom, corridor);

          if (currentRoom.bottomY() > otherRoom.bottomY()) {
            // Jump to the vertical end of the other room
            row = otherRoom.bottomY() + 1;
            col = iterationStart;
          } else {
            // End the iteration
            row = currentRoom.bottomY() + 1;
            col = iterationEnd + 1;
          }
        }
        col++;
      }
      row++;
    }
  }

  return corridors;
};

const generateCorridorsHorizontallyLeft = (
  sortedRooms: Room[],
  iterationStartModifier = 2,
  iterationEndModifier = 3,
  allRooms: Room[] = [],
): Corridor[] => {
  const allTheRooms: Room[] = allRooms?.length > 0 ? allRooms : sortedRooms;
  const corridors: Corridor[] = [];

  for (let i = 0; i < sortedRooms.length; i++) {
    // TODO: use allTheRooms?
    const currentRoom = sortedRooms[i];
    let row = currentRoom.topY();
    const iterationStart = currentRoom.leftX() - iterationStartModifier;

    if (iterationStart <= MAP_BORDER_THICKNESS) {
      continue; // Room is next to the left border of the map
    }

    const iterationEnd = Math.max(
      currentRoom.leftX() - iterationEndModifier,
      MAP_BORDER_THICKNESS,
    );

    while (row <= currentRoom.bottomY()) {
      let col = iterationStart;
      while (col >= iterationEnd) {
        const point: Coords = {x: col, y: row};
        const otherRoom = allTheRooms.find(it => it.contains(point));

        if (otherRoom) {
          if (otherRoom.isConnectedTo(currentRoom)) {
            break;
          }

          const absoluteLowerCorridorLimit = Math.min(currentRoom.bottomY(), otherRoom.bottomY());
          const corridorHorizontalBounds = {first: otherRoom.rightX(), second: currentRoom.leftX()};
          const corridorVerticalBounds = {first: point.y, second: absoluteLowerCorridorLimit};

          const corridorYPosition = corridorVerticalBounds.first !== corridorVerticalBounds.second ?
            randomInt(corridorVerticalBounds.first, corridorVerticalBounds.second + 1) :
            corridorVerticalBounds.first;

          const corridorStartingCoords: Coords = {x: corridorHorizontalBounds.first, y: corridorYPosition};
          const corridorEndingCoords: Coords = {x: corridorHorizontalBounds.second, y: corridorYPosition};

          const corridor = getCorridor(
            corridorStartingCoords,
            corridorEndingCoords,
            CorridorVector.HORIZONTAL_LEFT,
            1,
          );

          corridors.push(corridor);
          currentRoom.connectTo(otherRoom, corridor);

          if (currentRoom.bottomY() > otherRoom.bottomY()) {
            // Jump to the vertical end of the other room
            row = otherRoom.bottomY() + 1;
            col = iterationStart;
          } else {
            // End the iteration
            row = currentRoom.bottomY() + 1;
            col = iterationEnd - 1;
          }
        }
        col--;
      }
      row++;
    }
  }

  return corridors;
};

const generateCorridorsVerticallyUp = (
  sortedRooms: Room[],
  iterationStartModifier = 2,
  iterationEndModifier = 3,
  allRooms: Room[] = [],
): Corridor[] => {
  const allTheRooms = allRooms.length > 0 ? allRooms : sortedRooms;
  const corridors: Corridor[] = [];

  for (let i = 0; i < sortedRooms.length; i++) {
    const currentRoom = sortedRooms[i];
    let row = currentRoom.leftX();
    const iterationStart = currentRoom.topY() - iterationStartModifier;

    if (iterationStart <= MAP_BORDER_THICKNESS) {
      continue; // Room is next to the top border of the map
    }

    const iterationEnd = Math.max(
      currentRoom.topY() - iterationEndModifier,
      MAP_BORDER_THICKNESS,
    );

    while (row <= currentRoom.rightX()) {
      let col = iterationStart;
      while (col >= iterationEnd) {
        const point: Coords = {x: row, y: col};
        const otherRoom = allTheRooms.find(it => it.contains(point));

        if (otherRoom) {
          if (otherRoom.isConnectedTo(currentRoom)) {
            break;
          }

          const absoluteRightCorridorLimit = Math.min(currentRoom.rightX(), otherRoom.rightX());
          const corridorHorizontalBounds = {first: point.x, second: absoluteRightCorridorLimit};
          const corridorVerticalBounds = {first: currentRoom.topY(), second: otherRoom.bottomY};

          const corridorXPosition = corridorHorizontalBounds.first !== corridorHorizontalBounds.second ?
            randomInt(corridorHorizontalBounds.first, corridorHorizontalBounds.second + 1) :
            corridorHorizontalBounds.first;

          const corridorStartingPoint: Coords = {x: corridorXPosition, y: corridorVerticalBounds.first};
          const corridorEndingPoint: Coords = {x: corridorXPosition, y: corridorVerticalBounds.second()};

          const corridor = getCorridor(
            corridorStartingPoint,
            corridorEndingPoint,
            CorridorVector.VERTICAL_UP,
            1,
          );

          corridors.push(corridor);
          currentRoom.connectTo(otherRoom, corridor);

          if (currentRoom.rightX() > otherRoom.rightX()) {
            // Jump to the horizontal end of the other room
            row = otherRoom.rightX() + 1;
            col = iterationStart;
          } else {
            // End the iteration
            row = currentRoom.rightX() + 1;
            col = iterationEnd - 1;
          }
        }
        col--;
      }
      row++;
    }
  }

  return corridors;
};

const generateCorridorsVerticallyDown = (
  sortedRooms: Room[],
  mapWidth: number,
  iterationStartModifier = 2,
  iterationEndModifier = 3,
  allRooms: Room[] = [],
): Corridor[] => {
  const allTheRooms: Room[] = allRooms?.length > 0 ? allRooms : sortedRooms;
  const corridors: Corridor[] = [];

  for (let i = 0; i < sortedRooms.length; i++) {
    const currentRoom = sortedRooms[i];
    let row = currentRoom.leftX();
    const iterationStart = currentRoom.bottomY() + iterationStartModifier;

    if (iterationStart >= mapWidth - MAP_BORDER_THICKNESS) {
      continue; // Room is at the bottom of the map
    }

    const iterationEnd = Math.min(
      currentRoom.bottomY() + iterationEndModifier,
      mapWidth - MAP_BORDER_THICKNESS,
    );

    while (row <= currentRoom.rightX()) {
      let col = iterationStart;
      while (col <= iterationEnd) {
        const point: Coords = {x: row, y: col};
        const otherRoom = allTheRooms.find(it => it.contains(point));

        if (otherRoom) {
          if (otherRoom.isConnectedTo(currentRoom)) {
            break;
          }

          const absoluteRightCorridorLimit = Math.min(currentRoom.rightX(), otherRoom.rightX());
          const corridorHorizontalBounds = {first: point.x, second: absoluteRightCorridorLimit};
          const corridorVerticalBounds = {first: currentRoom.bottomY(), second: otherRoom.topY()};

          const corridorXPosition = corridorHorizontalBounds.first !== corridorHorizontalBounds.second ?
            randomInt(corridorHorizontalBounds.first, corridorHorizontalBounds.second + 1) :
            corridorHorizontalBounds.first;

          const corridorStartingPoint: Coords = {x: corridorXPosition, y: corridorVerticalBounds.second};
          const corridorEndingPoint: Coords = {x: corridorXPosition, y: corridorVerticalBounds.first};

          const corridor = getCorridor(
            corridorStartingPoint,
            corridorEndingPoint,
            CorridorVector.VERTICAL_DOWN,
            1,
          );

          corridors.push(corridor);
          currentRoom.connectTo(otherRoom, corridor);

          if (currentRoom.rightX() > otherRoom.rightX()) {
            // Jump to the horizontal end of the other room
            row = otherRoom.rightX() + 1;
            col = iterationStart;
          } else {
            // End the iteration
            row = currentRoom.rightX() + 1;
            col = iterationEnd + 1;
          }
        }
        col++;
      }
      row++;
    }
  }

  return corridors;
};
