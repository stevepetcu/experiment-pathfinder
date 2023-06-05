import {UUID} from 'crypto';

import {Coords} from './Coords';
import {Corridor} from './Corridor';

// TODO: should probably merge RoomDto with Room, since we're not using a backend service anymore.
export interface RoomDto {
  id: UUID;
  topLeft: Coords;
  width: number;
  height: number;
}

export interface Room {
  roomDto: RoomDto;
  leftX: () => number;
  rightX: () => number;
  topY: () => number;
  bottomY: () => number;
  area: () => number;
  withClearance: (clearance: number) => Room;
  isOverlapping: (otherRoom: Room) => boolean;
  connectedRooms: { room: Room, corridor: Corridor }[];
  isConnectedTo: (otherRoom: Room) => boolean;
  connectTo: (otherRoom: Room, corridor: Corridor) => void;
  disconnectFrom: (otherRoom: Room) => void;
  isVisited: boolean;
  visit: () => Room[];
  unVisit: () => void;
  isTooFarAwayFrom: (otherRoom: Room) => boolean;
  contains: (point: Coords) => boolean;
}

export const getRoom = (
  topLeft: RoomDto['topLeft'],
  width: RoomDto['width'],
  height: RoomDto['height'],
): Room => {
  const roomDto = {id: crypto.randomUUID(), topLeft, width, height};
  const connectedRooms: { room: Room, corridor: Corridor }[] = [];
  const isVisited = false;

  const leftX = () => _this.roomDto.topLeft.x;
  const rightX = () => _this.roomDto.topLeft.x + _this.roomDto.width - 1;
  const topY = () => _this.roomDto.topLeft.y;
  const bottomY = () => _this.roomDto.topLeft.y + _this.roomDto.height - 1;


  const area = () => _this.roomDto.width * _this.roomDto.height;
  const withClearance = (clearance: number): Room => {
    return getRoom(
      _this.roomDto.topLeft,
      _this.roomDto.width + clearance,
      _this.roomDto.height + clearance,
    );
  };
  const isOverlapping = (otherRoom: Room) => {
    // We want to leave >= 1 cell space between the rooms.
    const otherRoomWithClearance = otherRoom.withClearance(1);

    return !(
      area() === 0 || otherRoomWithClearance.area() === 0 // one of the rooms has an area equal to 0
      || rightX() < otherRoomWithClearance.leftX() // this room is left of the other room
      || leftX() > otherRoomWithClearance.rightX() // this room is right of the other room
      || bottomY() < otherRoomWithClearance.topY() // this room is above the other room
      || topY() > otherRoomWithClearance.bottomY() // this room is below the other room
    );


  };

  const isConnectedTo = (otherRoom: Room) => _this.connectedRooms
    .some(it => it.room.roomDto.id === otherRoom.roomDto.id);

  const connectTo = (otherRoom: Room, corridor: Corridor) => {
    if (!isConnectedTo(otherRoom)) {
      _this.connectedRooms.push({room: otherRoom, corridor});
    }

    if (!otherRoom.isConnectedTo(_this)) {
      otherRoom.connectedRooms.push({room: _this, corridor});
    }
  };

  const disconnectFrom = (otherRoom: Room) => {
    let otherRoomIndex = _this.connectedRooms
      .findIndex(it => it.room.roomDto.id === otherRoom.roomDto.id);

    while (otherRoomIndex > -1) {
      _this.connectedRooms.splice(otherRoomIndex, 1);
      otherRoomIndex = _this.connectedRooms
        .findIndex(it => it.room.roomDto.id === otherRoom.roomDto.id);
    }

    // TODO: disconnect the other room from this rooms as well?
  };

  const visit = () => {
    _this.isVisited = true;

    return _this.connectedRooms.map(it => it.room);
  };

  const unVisit = () => {
    _this.isVisited = false;
  };

  const isTooFarAwayFrom = (otherRoom: Room) => {
    return !_this.isOverlapping(otherRoom.withClearance(3));
  };

  const contains = (point: Coords) => {
    return leftX() <= point.x && topY() <= point.y && rightX() >= point.x && bottomY() >= point.y;
  };

  const _this = {
    roomDto,
    leftX,
    rightX,
    topY,
    bottomY,
    area,
    withClearance,
    isOverlapping,
    connectedRooms,
    isConnectedTo,
    connectTo,
    disconnectFrom,
    isVisited,
    visit,
    unVisit,
    isTooFarAwayFrom,
    contains,
  };

  return _this;
};
