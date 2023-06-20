
import {logDebug} from '../utils/Console';
import {Coords} from './Coords';
import {Corridor, CorridorVector} from './Corridor';
import {Room, RoomDto} from './Room';

export enum CellStatus { // TODO: remove unused statuses, rename EMPTY to ACCESSIBLE
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
  roomId?: RoomDto['id'] | Corridor['id'];
  isAccessible(): boolean;
}

export interface Grid {
  cells: GridCell[][];
  placeRooms: (rooms: Room[]) => Promise<boolean>;
  placeCorridors: (corridors: Corridor[]) => Promise<boolean>;
  setStatusForCellAt: (status: CellStatus, x: number, y: number) => GridCell;
  getCellAt: (x: number, y: number) => GridCell;
  destroy: () => void;
}

const getCell = (x: number, y: number, status: CellStatus, roomId?: RoomDto['id']) => {
  const isAccessible = () => {
    return _this.status !== CellStatus.OBSTACLE
    && _this.status !== CellStatus.OUT_OF_BOUNDS;
  };

  const _this = {x, y, status, roomId, isAccessible};

  return _this;
};

const OUT_OF_BOUNDS_CELL = getCell(-1, -1, CellStatus.OUT_OF_BOUNDS);

export const getSquareGrid = async (width: number): Promise<Grid> => {
  const cells: GridCell[][] = [];


  // Fill with obstacles. TODO: optimise with room placing
  for (let y = 0; y < width; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      const newCell = getCell(x, y, CellStatus.OBSTACLE);
      newCell.status = CellStatus.OBSTACLE;

      row.push(newCell);
    }

    cells.push(row);
  }

  const setStatusForCellAt = (status: CellStatus, x: number, y: number): GridCell => {
    const cell = _this.cells[y][x];
    cell.status = status;
    if (CellStatus.VISITED === status) {
      setTimeout(() => {
        cell.status = CellStatus.EMPTY;
      }, 400);
    }

    return cell;
  };

  const getCellAt = (x: number, y: number): GridCell => {
    if (_this.cells[y] && _this.cells[y][x]) {
      return _this.cells[y][x];
    }

    OUT_OF_BOUNDS_CELL.x = x;
    OUT_OF_BOUNDS_CELL.y = y;
    return OUT_OF_BOUNDS_CELL;
  };

  const placeRooms = async (rooms: Room[]) => {
    for (let i = 0; i < rooms.length; i++) {
      logDebug('Placing:', rooms[i]);

      const room = rooms[i];
      const roomCoords: Coords = room.roomDto.topLeft;
      const roomWidth = room.roomDto.width;
      const roomHeight = room.roomDto.height;

      for (let roomY = roomCoords.y; roomY < (roomCoords.y + roomHeight); roomY++) {
        for (let roomX = roomCoords.x; roomX < (roomCoords.x + roomWidth); roomX++) {
          const cell = getCellAt(roomX, roomY);
          if (cell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.cells[roomY][roomX].status = CellStatus.EMPTY;
            _this.cells[roomY][roomX].roomId = room.roomDto.id;
          } else {
            logDebug('Tried to place empty cell at: ', cell);
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
      logDebug('Placing:', corridor);
      while (currentY < corridor.startCoords.y + corridor.width) {
        let currentX = corridor.startCoords.x + 1;
        while (currentX < corridor.endCoords.x) {
          const currentCell = getCellAt(currentX, currentY);
          if (currentCell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.cells[currentY][currentX].status = CellStatus.EMPTY;
            _this.cells[currentY][currentX].roomId = corridor.id;
          } else {
            logDebug('Tried to place empty cell at: ', currentCell);
          }
          currentX++;
        }
        currentY++;
      }
    }

    for (let i = 0; i < verticalCorridors.length; i++) {
      const corridor = verticalCorridors[i];
      let currentX = corridor.startCoords.x;
      logDebug('Placing:', corridor);
      while (currentX < corridor.startCoords.x + corridor.width) {
        let currentY = corridor.startCoords.y - 1;
        while (currentY > corridor.endCoords.y) {
          const currentCell = getCellAt(currentX, currentY);
          if (currentCell.status !== CellStatus.OUT_OF_BOUNDS) {
            _this.cells[currentY][currentX].status = CellStatus.EMPTY;
            _this.cells[currentY][currentX].roomId = corridor.id;
          } else {
            logDebug('Tried to place empty cell at: ', currentCell);
          }
          currentY--;
        }
        currentX++;
      }
    }

    return true;
  };

  const destroy = () => {
    _this.cells = [];
  };

  const _this = {
    cells,
    placeRooms,
    placeCorridors,
    setStatusForCellAt,
    getCellAt,
    destroy,
  };

  return _this;
};

export const getEmptyGrid = (): Grid => {
  const placeRooms = async () => false;
  const placeCorridors = async () => false;

  const setStatusForCellAt = (status: CellStatus, x: Coords['x'], y: Coords['y']) =>
    getCell(x, y, CellStatus.OUT_OF_BOUNDS);

  const getCellAt = (_x: number, _y: number): GridCell => OUT_OF_BOUNDS_CELL;

  const destroy = () => {return; };

  return {
    cells: [[]],
    placeRooms,
    placeCorridors,
    setStatusForCellAt,
    getCellAt,
    destroy,
  };
};
