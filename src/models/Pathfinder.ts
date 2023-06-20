// Based on https://github.com/bgrins/javascript-astar/blob/master/astar.js

import binaryHeap, {BinaryHeap} from '../utils/BinaryHeap';
import {calcDiagonalDistance, calcManhattanDistance} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import {Coords} from './Coords';
import { Grid, GridCell} from './SquareGrid';

export interface PathfinderCell {
  gridCell: GridCell;
  f: number;
  g: number;
  h: number;
  // The weight can give certain cells a higher cost of traversal. A weight of 0 means the cell's inaccessible.
  weight: number;
  visited: boolean;
  closed: boolean;
  parent: PathfinderCell | null;
  isAccessible: () => boolean;
  reset: () => void;
  getNeighbourCoordinates: () => {corners: (Coords & { cost: number })[], sides: (Coords & { cost: number })[]};
}

const getPathfinderCell = (gridCell: GridCell, weight: number): PathfinderCell => {
  const isAccessible = () => gridCell.isAccessible();

  const reset = () => {
    _this.f = 0;
    _this.g = 0;
    _this.h = 0;
    _this.visited = false;
    _this.closed = false;
    _this.parent = null;
  };

  const getNeighbourCoordinates = ():
    {corners: (Coords & { cost: number })[], sides: (Coords & { cost: number })[]} => {
    return {
      corners: [
        {
          // bottom left
          x: _this.gridCell.x - 1,
          y: _this.gridCell.y + 1,
          cost: _this.weight * Math.sqrt(2), // Diagonal distance for one block, sqrt(a^2 + b^2), a == b == 1.
        },
        {
          // bottom right
          x: _this.gridCell.x + 1,
          y: _this.gridCell.y + 1,
          cost: _this.weight * Math.sqrt(2),
        },
        {
          // top right
          x: _this.gridCell.x + 1,
          y: _this.gridCell.y - 1,
          cost: _this.weight * Math.sqrt(2),
        },
        {
          // top left
          x: _this.gridCell.x - 1,
          y: _this.gridCell.y - 1,
          cost: _this.weight * Math.sqrt(2),
        },
      ],
      sides: [
        {
          // bottom
          x: _this.gridCell.x,
          y: _this.gridCell.y + 1,
          cost: _this.weight,
        },
        {
          // right
          x: _this.gridCell.x + 1,
          y: _this.gridCell.y,
          cost: _this.weight,
        },
        {
          // top
          x: _this.gridCell.x,
          y: _this.gridCell.y - 1,
          cost: _this.weight,
        },
        {
          // left
          x: _this.gridCell.x - 1,
          y: _this.gridCell.y,
          cost: _this.weight,
        },
      ],
    };
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
  tracePath: (
    from: GridCell,
    to: GridCell,
    avoidCell?: GridCell,
  ) => GridCell[];
  getGridCellAt: (x: number, y: number) => GridCell;
  options: {
    allowDiagonalMovement: boolean;
    returnClosestCellOnPathFailure: boolean;
  };
  generateObstacleAwareRandomCoordsInAreaAround(
    center: Coords,
    radius: number,
    avoidTheCenter: boolean
  ): Coords | null;
  destroy: () => void;
}

export const getPathfinder = (
  grid: Grid,
  options?: {allowDiagonalMovement?: boolean, returnClosestCellOnPathFailure?: boolean},
): Pathfinder => {
  const pfOptions = {allowDiagonalMovement: true, returnClosestCellOnPathFailure: true, ...options};

  const scoreFn = (element: PathfinderCell) => element.f;

  const cells = grid.cells.map(row => row.map(cell => {
    const weight = cell.isAccessible() ? 1 : 0;
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

  const getNeighbours = (cell: PathfinderCell, avoidCell?: GridCell): { cell: PathfinderCell, cost: number }[] => {
    const neighbourCoords = cell.getNeighbourCoordinates();
    const neighbourCoordsForHeuristic = _this.options.allowDiagonalMovement ?
      neighbourCoords.corners.concat(neighbourCoords.sides) :
      neighbourCoords.sides;
    const neighbours: { cell: PathfinderCell, cost: number }[] = [];
    neighbourCoordsForHeuristic.map(nc => {
      if (_this.cells[nc.y][nc.x].isAccessible()) {
        if (!avoidCell) {
          neighbours.push({
            cell: _this.cells[nc.y][nc.x],
            cost: nc.cost,
          });
        } else {
          // Avoid the cell and its neighbours by increasing their weight.
          const pathfinderCellToAvoid = _this.cells[avoidCell.y][avoidCell.x];

          const cellToAvoidNeighbourCoords = pathfinderCellToAvoid.getNeighbourCoordinates();
          const avoidCoords = cellToAvoidNeighbourCoords.sides.concat(cellToAvoidNeighbourCoords.corners);

          const neighbourToPush = {
            cell: _this.cells[nc.y][nc.x],
            cost: nc.cost,
          };

          if (nc.x === pathfinderCellToAvoid.gridCell.x && nc.y === pathfinderCellToAvoid.gridCell.y) {
            neighbourToPush.cost *= 3;
          }
          if (avoidCoords.some(ac => ac.x === nc.x && ac.y === nc.y)) {
            neighbourToPush.cost *= 2;
          }

          neighbours.push(neighbourToPush);
        }
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

  const tracePath = (from: GridCell, to: GridCell, avoidCell?: GridCell): GridCell[] => {
    reset();
    const heuristic = pfOptions.allowDiagonalMovement ? calcDiagonalDistance : calcManhattanDistance;
    const start: PathfinderCell = _this.cells[from.y][from.x];
    const end: PathfinderCell = _this.cells[to.y][to.x];

    let closestCell = start; // Used when options.returnClosestCellOnPathFailure === true.

    start.h = heuristic(start.gridCell, end.gridCell);
    addDirtyCell(start);
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
      const neighbours = getNeighbours(currentElement, avoidCell);

      for (let i = 0, il = neighbours.length; i < il; i++) {
        const neighbour = neighbours[i];

        if (neighbour.cell.closed || !neighbour.cell.isAccessible()) {
          // Not a valid node to process, skip to next neighbour.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbour is the shortest one we have seen yet.
        const gScore = currentElement.g + neighbour.cost;
        const beenVisited = neighbour.cell.visited;

        if (!beenVisited || gScore < neighbour.cell.g) {
          // Found an optimal (so far) path to this node. Take score for node to see how good it is.
          neighbour.cell.visited = true;
          neighbour.cell.parent = currentElement;
          neighbour.cell.h = neighbour.cell.h || heuristic(neighbour.cell.gridCell, end.gridCell);
          neighbour.cell.g = gScore;
          neighbour.cell.f = neighbour.cell.g + neighbour.cell.h;
          addDirtyCell(neighbour.cell);

          if (pfOptions.returnClosestCellOnPathFailure) {
            // If the neighbour is closer than the current closestCell or if it's equally close but has
            // a cheaper path than the current closest node, then it becomes the closest node.
            if (
              neighbour.cell.h < closestCell.h ||
              (neighbour.cell.h === closestCell.h && neighbour.cell.g < closestCell.g)
            ) {
              closestCell = neighbour.cell;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            _this.heap.push(neighbour.cell);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            _this.heap.rescore(neighbour.cell);
          }
        }
      }
    }

    // No result was found - empty array signifies failure to find path.
    return pfOptions.returnClosestCellOnPathFailure ? pathTo(closestCell) : [];
  };

  const generateObstacleAwareRandomCoordsInAreaAround = (
    center: Coords,
    radius: number,
    avoidTheCenter: boolean,
    tries = 0,
  ): Coords | null => {
    if (tries > 9) {
      return null;
    }
    const minX = center.x - radius;
    const maxX = center.x + radius;
    const minY = center.y - radius;
    const maxY = center.y + radius;

    const x = randomInt(minX, maxX + 1);
    const y = randomInt(minY, maxY + 1);

    tries++;

    const cell = getGridCellAt(x, y);

    if (!cell.isAccessible()) {
      return generateObstacleAwareRandomCoordsInAreaAround(
        center,
        radius,
        avoidTheCenter,
        tries,
      );
    }

    if (avoidTheCenter && x === center.x && y === center.y) {
      return generateObstacleAwareRandomCoordsInAreaAround(
        center,
        radius,
        avoidTheCenter,
        tries,
      );
    }

    return {x, y};
  };

  const destroy = () => {
    _this.cells = [];
    _this.dirtyCells = [];
    _this.heap = null;
  };

  const _this = {
    cells,
    dirtyCells,
    heap,
    tracePath,
    reset,
    getGridCellAt,
    options: pfOptions,
    generateObstacleAwareRandomCoordsInAreaAround,
    destroy,
  };

  return _this;
};

export const getEmptyPathfinder = (grid: Grid): Pathfinder => {
  return {
    cells: [[]],
    heap: binaryHeap(() => 0),
    tracePath: () => [],
    getGridCellAt: (x: number, y: number) => {
      return grid.getCellAt(x, y);
    },
    dirtyCells: [],
    options: {
      allowDiagonalMovement: true,
      returnClosestCellOnPathFailure: true,
    },
    generateObstacleAwareRandomCoordsInAreaAround(
      _center: Coords, _radius: number, _avoidTheCenter: boolean,
    ): Coords | null {
      return null;
    },
    destroy: () => { return; },
  };
};
