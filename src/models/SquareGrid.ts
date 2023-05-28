
import {Coords} from './Coords';
import {Corridor, CorridorVector} from './Corridor';
import {Room, RoomDto} from './Room';

export enum CellStatus {
  EMPTY = 'empty',
  PLAYER = 'player',
  OBSTACLE = 'obstacle',
  VISITED = 'visited',
  OUT_OF_BOUNDS = 'out-of-bounds',
}

export interface GridCell {
  x: number;
  y: number;
  status: CellStatus;
  roomId?: RoomDto['id'];
  isEmpty: () => boolean;
}

export interface Grid {
  gridCells: GridCell[][];
  placeRooms: (rooms: Room[]) => Promise<boolean>;
  placeCorridors: (corridors: Corridor[]) => Promise<boolean>;
}

const getCell = (x: number, y: number, status: CellStatus, roomId?: RoomDto['id']) => {
  const isEmpty = () => {
    return _this.status === CellStatus.EMPTY ||
      _this.status === CellStatus.VISITED;
  };

  const _this = {x, y, status, roomId, isEmpty};

  return _this;
};

export const getSquareGrid = async (width: number): Promise<Grid> => {
  const gridCells: GridCell[][] = [];

  // Fill with obstacles. TODO: optimise with room placing
  for (let y = 0; y < width; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      const newCell = getCell(x, y, CellStatus.OBSTACLE);
      newCell.status = CellStatus.OBSTACLE;

      row.push(newCell);
    }

    gridCells.push(row);
  }

  const isCellAccessible = (cell: GridCell): boolean => {
    // TODO: simply use GridCell::isEmpty()? I can't remember why I implemented the fn like this way back.
    // return CellStatus.OUT_OF_BOUNDS !== cell.status
    //   && cell.x < width
    //   && cell.y < width
    //   && _this.gridCells[cell.y][cell.x].isEmpty();

    return _this.gridCells[cell.y][cell.x].isEmpty();
  };

  const setCellStatusAt = (x: number, y: number, status: CellStatus): void => {
    _this.gridCells[y][x].status = status;
    if (CellStatus.VISITED === status) {
      setTimeout(() => {
        _this.gridCells[y][x].status = CellStatus.EMPTY;
      }, 1000);
    }
  };

  const getCellAt = (x: number, y: number): GridCell => {
    if (_this.gridCells[y] && _this.gridCells[y][x]) {
      return _this.gridCells[y][x];
    }

    return getCell(x, y, CellStatus.OUT_OF_BOUNDS);
  };

  const placeRooms = async (rooms: Room[]) => {
    for (let i = 0; i < rooms.length; i++) {
      console.debug('Placing:', rooms[i]);

      const room = rooms[i];
      const roomCoords: Coords = room.roomDto.topLeft;
      const roomWidth = room.roomDto.width;
      const roomHeight = room.roomDto.height;

      for (let roomY = roomCoords.y; roomY < (roomCoords.y + roomHeight); roomY++) {
        for (let roomX = roomCoords.x; roomX < (roomCoords.x + roomWidth); roomX++) {
          const cell = getCellAt(roomX, roomY);
          if (cell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.gridCells[roomY][roomX].status = CellStatus.EMPTY;
            _this.gridCells[roomY][roomX].roomId = room.roomDto.id;
          } else {
            console.debug('Tried to place empty cell at: ', cell);
          }
        }
      }
    }

    return true;
  };

  const placeCorridors = async (corridors: Corridor[]) => {
    const horizontalCorridors = corridors.filter(it => it.vector === CorridorVector.HORIZONTAL_LEFT
      || it.vector === CorridorVector.HORIZONTAL_RIGHT);
    const verticalCorridors = corridors.filter(it => it.vector === CorridorVector.VERTICAL_UP
      || it.vector === CorridorVector.VERTICAL_DOWN);

    for (let i = 0; i < horizontalCorridors.length; i++) {
      const corridor = horizontalCorridors[i];
      let currentY = corridor.startCoords.y;
      console.debug('Placing:', corridor);
      while (currentY < corridor.startCoords.y + corridor.width) {
        let currentX = corridor.startCoords.x + 1;
        while (currentX < corridor.endCoords.x) {
          const currentCell = getCellAt(currentX, currentY);
          if (currentCell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.gridCells[currentY][currentX].status = CellStatus.EMPTY;
            _this.gridCells[currentY][currentX].roomId = corridor.id;
          } else {
            console.debug('Tried to place empty cell at: ', currentCell);
          }
          currentX++;
        }
        currentY++;
      }
    }

    for (let i = 0; i < verticalCorridors.length; i++) {
      const corridor = verticalCorridors[i];
      let currentX = corridor.startCoords.x;
      console.debug('Placing:', corridor);
      while (currentX < corridor.startCoords.x + corridor.width) {
        let currentY = corridor.startCoords.y - 1;
        while (currentY > corridor.endCoords.y) {
          const currentCell = getCellAt(currentX, currentY);
          if (currentCell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.gridCells[currentY][currentX].status = CellStatus.EMPTY;
            _this.gridCells[currentY][currentX].roomId = corridor.id;
          } else {
            console.debug('Tried to place empty cell at: ', currentCell);
          }
          currentY--;
        }
        currentX++;
      }
    }

    return true;
  };

  const _this = {gridCells, placeRooms, placeCorridors};

  return _this;
};

export const getEmptyGrid = (): Grid => {
  const placeRooms = async () => false;
  const placeCorridors = async () => false;

  return {gridCells: [[]], placeRooms, placeCorridors};
};
