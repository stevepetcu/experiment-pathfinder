import {GridCell} from './SquareGrid';

export interface PathfinderCell {
  gridCell: GridCell;
  f: number;
  g: number;
  h: number;
  accessible: boolean;
  visited: boolean;
  closed: boolean;
  parent: PathfinderCell
}
