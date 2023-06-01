// Based on https://github.com/bgrins/javascript-astar/blob/master/astar.js

import binaryHeap, {BinaryHeap} from '../utils/BinaryHeap';
import {Coords} from './Coords';
import {CellStatus, Grid, GridCell} from './SquareGrid';

export interface PathfinderCell {
  gridCell: GridCell;
  f: number;
  g: number;
  h: number;
  // The weight can give certain cells a higher cost of traversal.
  weight: number;
  getCostFrom: (otherCell: PathfinderCell) => number;
  visited: boolean;
  closed: boolean;
  parent: PathfinderCell | null;
  isAccessible: () => boolean;
  reset: () => void;
  getNeighbourCoordinates: () => Coords[];
}

const getPathfinderCell = (gridCell: GridCell, weight: number): PathfinderCell => {
  const getCostFrom = (otherCell: PathfinderCell) => {
    // Take diagonal weight into consideration.
    if (otherCell && otherCell.gridCell.x != _this.gridCell.x && otherCell.gridCell.y != _this.gridCell.y) {
      return _this.weight * Math.sqrt(2);
    }
    return _this.weight;
  };

  const isAccessible = () => gridCell.isAccessible();

  const reset = () => {
    _this.f = 0;
    _this.g = 0;
    _this.h = 0;
    _this.visited = false;
    _this.closed = false;
    _this.parent = null;
  };

  const getNeighbourCoordinates = (): Coords[] => {
    return [
      {
        // bottom left
        x: _this.gridCell.x - 1,
        y: _this.gridCell.y + 1,
      },
      {
        // bottom right
        x: _this.gridCell.x + 1,
        y: _this.gridCell.y + 1,
      },
      {
        // top right
        x: _this.gridCell.x + 1,
        y: _this.gridCell.y - 1,
      },
      {
        // top left
        x: _this.gridCell.x - 1,
        y: _this.gridCell.y - 1,
      },
      {
        // bottom
        x: _this.gridCell.x,
        y: _this.gridCell.y + 1,
      },
      {
        // right
        x: _this.gridCell.x + 1,
        y: _this.gridCell.y,
      },
      {
        // top
        x: _this.gridCell.x,
        y: _this.gridCell.y - 1,
      },
      {
        // left
        x: _this.gridCell.x - 1,
        y: _this.gridCell.y,
      },
    ];
  };

  const _this = {
    gridCell,
    f: 0,
    g: 0,
    h: 0,
    weight,
    visited: false,
    closed: false,
    parent: null,
    getCostFrom,
    isAccessible,
    reset,
    getNeighbourCoordinates,
  };

  return _this;
};

export interface Pathfinder {
  cells: PathfinderCell[][];
  dirtyCells: PathfinderCell[];
  heap: BinaryHeap<PathfinderCell>;
  tracePath: (from: GridCell, to: GridCell) => GridCell[];
  getGridCellAt: (x: number, y: number) => GridCell;
  setStatusForGridCellAt: (status: CellStatus, x: number, y: number) => GridCell; // TODO: remove?
  options: {
    allowDiagonalMovement: boolean;
    returnClosestCellOnPathFailure: boolean;
  }
}

export const getPathfinder = (
  grid: Grid,
  options = {allowDiagonalMovement: true, returnClosestCellOnPathFailure: true},
): Pathfinder => {

  const calcManhattanDistance = (from: PathfinderCell, to: PathfinderCell) => {
    return Math.abs(from.gridCell.x - to.gridCell.x) + Math.abs(from.gridCell.y - to.gridCell.y);
  };

  const calcDiagonalDistance = (from: PathfinderCell, to: PathfinderCell) => {
    const D = 1;
    const D2 = Math.sqrt(2);
    const deltaX = Math.abs(from.gridCell.x - to.gridCell.x);
    const deltaY = Math.abs(from.gridCell.y - to.gridCell.y);

    // TODO: try this formula return min(delta_x, delta_y) * sqrt(2) + abs(delta_x - delta_y)
    return (D * (deltaX + deltaY)) + ((D2 - (2 * D)) * Math.min(deltaX, deltaY));
  };
  const scoreFn = (element: PathfinderCell) => element.f;

  const cells = grid.cells.map(row => row.map(cell => {
    const weight = cell.isAccessible() ? 0 : 1;
    return getPathfinderCell(cell, weight);
  }));

  const dirtyCells: PathfinderCell[] = [];

  const heap = binaryHeap(scoreFn);

  const addDirtyCell = (cell: PathfinderCell) => {
    _this.dirtyCells.push(cell);
  };
  const reset = () => {
    _this.dirtyCells.map(cell => cell.reset());
    _this.heap = binaryHeap(scoreFn);
  };

  const getGridCellAt = (x: number, y: number): GridCell => {
    return grid.getCellAt(x, y);
  };

  const setStatusForGridCellAt = (status: CellStatus, x: number, y: number) => {
    return grid.setStatusForCellAt(status, x, y);
  };

  const getNeighbours = (cell: PathfinderCell): PathfinderCell[] => {
    const neighbourCoords = cell.getNeighbourCoordinates();
    const neighbours: PathfinderCell[] = [];
    neighbourCoords.map(nc => {
      if (_this.cells[nc.y][nc.x].isAccessible()) {
        neighbours.push(_this.cells[nc.y][nc.x]);
      }
    });

    return neighbours;
  };

  const pathTo = (cell: PathfinderCell) => {
    let curr = cell;
    const result: PathfinderCell[] = [];

    while (curr.parent) {
      result.unshift(curr);
      curr = curr.parent;
    }

    return result.map(cell => cell.gridCell);
  };

  const tracePath = (from: GridCell, to: GridCell): GridCell[] => {
    reset();

    const heuristic = options.allowDiagonalMovement ? calcDiagonalDistance : calcManhattanDistance;
    const start: PathfinderCell = _this.cells[from.y][from.x];
    const end: PathfinderCell = _this.cells[to.y][to.x];

    let closestNode = start; // Used when options.returnClosestCellOnPathFailure === true.

    start.h = heuristic(start, end);

    _this.heap.push(start);

    while (_this.heap.size() > 0) {
      // Grab the lowest f(x) to process next. The heap keeps this sorted for us.
      const currentElement = _this.heap.pop();

      // End case -- result has been found, return the traced path.
      if (currentElement === end) {
        return pathTo(currentElement);
      }

      // Normal case -- move currentElement from open to closed, process each of its neighbours.
      currentElement.closed = true;

      // Find all the neighbours for the current node.
      const neighbours = getNeighbours(currentElement);

      for (let i = 0, il = neighbours.length; i < il; i++) {
        const neighbour = neighbours[i];

        if (neighbour.closed || !neighbour.isAccessible()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbour is the shortest one we have seen yet.
        const gScore = currentElement.g + neighbour.getCostFrom(currentElement);
        const beenVisited = neighbour.visited;

        if (!beenVisited || gScore < neighbour.g) {
          // Found an optimal (so far) path to this node. Take score for node to see how good it is.
          neighbour.visited = true;
          neighbour.parent = currentElement;
          neighbour.h = neighbour.h || heuristic(neighbour, end);
          neighbour.g = gScore;
          neighbour.f = neighbour.g + neighbour.h;
          addDirtyCell(neighbour);

          if (options.returnClosestCellOnPathFailure) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node, then it becomes the closest node.
            if (neighbour.h < closestNode.h || (neighbour.h === closestNode.h && neighbour.g < closestNode.g)) {
              closestNode = neighbour;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            _this.heap.push(neighbour);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            _this.heap.rescore(neighbour);
          }
        }
      }
    }

    // No result was found - empty array signifies failure to find path.
    return options.returnClosestCellOnPathFailure? pathTo(closestNode) : [];
  };

  const _this = {
    cells,
    dirtyCells,
    heap,
    tracePath,
    reset,
    getGridCellAt,
    setStatusForGridCellAt,
    options,
  };

  return _this;
};

export const getEmptyPathfinder = (grid: Grid): Pathfinder => {
  return {
    cells: [[]],
    heap: binaryHeap(() => 0),
    tracePath: () => [],
    getGridCellAt: (x: number, y: number) => { return grid.getCellAt(x, y); },
    setStatusForGridCellAt: (status: CellStatus, x: number, y: number) => { return grid.getCellAt(x, y); },
    dirtyCells: [],
    options: {
      allowDiagonalMovement: true,
      returnClosestCellOnPathFailure: true,
    },
  };
};
