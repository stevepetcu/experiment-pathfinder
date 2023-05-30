import binaryHeap, {BinaryHeap} from '../utils/BinaryHeap';
import {Coords} from './Coords';
import {Grid, GridCell} from './SquareGrid';

export enum Heuristics {
  MANHATTAN = 'manhattan',
  DIAGONAL = 'diagonal',
}

export interface PathfinderCell {
  gridCell: GridCell;
  f: number;
  g: number;
  h: number;
  visited: boolean;
  closed: boolean;
  parent: PathfinderCell | null;
  isEmpty: () => boolean;
  reset: () => void;
  useDiagonalHeuristics: (otherCell: PathfinderCell) => void;
  useManhattanHeuristics: (otherCell: PathfinderCell) => void;
  getNeighbourCoordinates: (heuristics: Heuristics) => Coords[];
}

const getPathfinderCell = (gridCell: GridCell): PathfinderCell => {
  const isEmpty = () => gridCell.isEmpty();

  const reset = () => {
    _this.f = 0;
    _this.g = 0;
    _this.h = 0;
    // _this.accessible = true;
    _this.visited = false;
    _this.closed = false;
    _this.parent = null;
  };

  const useDiagonalHeuristics = (otherCell: PathfinderCell): void => {
    _this.h = _this.h || Math.max(
      Math.abs(_this.gridCell.x - otherCell.gridCell.x),
      Math.abs(_this.gridCell.y - otherCell.gridCell.y),
    );
  };

  const useManhattanHeuristics = (otherCell: PathfinderCell): void => {
    _this.h = _this.h ||
      Math.abs(_this.gridCell.x - otherCell.gridCell.x) + Math.abs(_this.gridCell.y - otherCell.gridCell.y);
  };

  const getNeighbourCoordinates = (heuristics: Heuristics): Coords[] => {
    const corners = [
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
    ];
    const sides = [
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

    return heuristics === Heuristics.MANHATTAN ? sides : sides.concat(corners);
  };

  const _this = {
    gridCell,
    f: 0,
    g: 0,
    h: 0,
    visited: false,
    closed: false,
    parent: null,
    isEmpty,
    reset,
    useDiagonalHeuristics,
    useManhattanHeuristics,
    getNeighbourCoordinates,
  };

  return _this;
};

export interface Pathfinder {
  cells: PathfinderCell[][];
  heap: BinaryHeap<PathfinderCell>;
  tracePath: (from: GridCell, to: GridCell, heuristics?: Heuristics) => GridCell[];
  reset: () => void;
}

export const getPathfinder = (grid: Grid, scoreFn: BinaryHeap<PathfinderCell>['scoreFn']) => {
  // TODO: update according to https://github.com/bgrins/javascript-astar/blob/master/astar.js
  // TODO: merge the pathfinder and grid, or find another way to not have to duplicate memory alloc for cells.
  const cells = grid.cells.map(row => row.map(cell => getPathfinderCell(cell)));
  const heap = binaryHeap(scoreFn);

  const reset = () => {
    _this.cells.map((row) => row.map(
      (cell) => cell.reset(),
    ));
    _this.heap = binaryHeap(scoreFn);
  };

  const getNeighbours = (cell: PathfinderCell, heuristics: Heuristics): PathfinderCell[] => {
    const neighbourCoords = cell.getNeighbourCoordinates(heuristics);
    const neighbours: PathfinderCell[] = [];
    neighbourCoords.map(nc => {
      if (_this.cells[nc.y][nc.x].isEmpty()) {
        neighbours.push(_this.cells[nc.y][nc.x]);
      }
    });

    return neighbours;
  };

  const tracePath = (from: GridCell, to: GridCell, heuristics = Heuristics.MANHATTAN): GridCell[] => {
    const start: PathfinderCell = _this.cells[from.y][from.x];
    const end: PathfinderCell = _this.cells[to.y][to.x];

    _this.heap.push(start);

    while (_this.heap.size() > 0) {
      // Grab the lowest f(x) to process next. The heap keeps this sorted for us.
      const currentElement = _this.heap.pop();

      // End case -- result has been found, return the traced path.
      if (currentElement === end) {
        let curr = currentElement;
        const result: PathfinderCell[] = [];

        while (curr.parent && !result.find((cell: PathfinderCell) => cell === curr.parent)) {
          // TODO why is this weird looping behaviour happening? (check against original (improved) algo version)
          result.push(curr);
          curr = curr.parent;
        }

        return result.map(cell => cell.gridCell);
      }

      // Normal case -- move currentElement from open to closed, process each of its neighbours.
      currentElement.closed = true;

      // Find all neighbours for the current node. Optionally find diagonal neighbours as well (false by default).
      // TODO: consolidate with the heuristics stuff below (see original (improved) algo version)
      // TODO: Or don't. It seems like this combination of using diagonal heuristics for the path and manhattan for the neighbours works most naturally.
      const neighbours = getNeighbours(currentElement, heuristics);

      for (let i = 0, il = neighbours.length; i < il; i++) {
        const neighbor = neighbours[i];

        if (!neighbor.isEmpty()) {
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        // TODO: add dynamic cost based on node type? Like nodes that are harder to cross because of obstacles?
        const gScore = currentElement.g + (currentElement.isEmpty() ? 1 : 50);
        const beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {
          // Found an optimal (so far) path to this node. Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentElement;
          // neighbor.useManhattanHeuristics(end);
          heuristics === Heuristics.MANHATTAN ?
            neighbor.useManhattanHeuristics(end) :
            neighbor.useDiagonalHeuristics(end);
          // neighbor.setDiagonalHeuristicTo(end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            _this.heap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            _this.heap.rescore(neighbor);
          }
        }
      }
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  };

  const _this = {cells, heap, tracePath, reset};

  return _this;
};

export const getEmptyPathfinder = (): Pathfinder => {
  return {
    cells: [[]],
    heap: binaryHeap(() => 0),
    tracePath: () => [],
    reset: () => { return; },
  };
};
