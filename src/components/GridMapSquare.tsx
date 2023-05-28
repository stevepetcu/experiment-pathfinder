import {createEffect, createSignal, For, onMount, Show} from 'solid-js';

import {Coords} from '../models/Coords';
import {generateCorridors, generatePlayerStartingPosition, generateRooms} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder, PathfinderCell} from '../models/Pathfinder';
import {getPlayer} from '../models/Player';
import {CellStatus, getEmptyGrid, getSquareGrid, Grid, GridCell} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';

interface GridMapSquareProps {
  width?: number;
  minRoomWidth?: number;
  maxRoomWidth?: number;
}

export default function GridMapSquare(props: GridMapSquareProps) {
  const CELL_WIDTH = 20;
  const CELL_BORDER_WIDTH = 0.25;

  // TODO: pass in from some text fields in the parent. Figure out the default values SolidJS style.
  const mapWidth = props.width || 75;
  const minRoomWidth = props.width || 4;
  const maxRoomWidth = props.width || 8;

  const [numberOfRooms, setNumberOfRooms] = createSignal(0);
  const [hasPlacedRooms, setHasPlacedRooms] = createSignal(false);
  const [timeToPlaceRooms, setTimeToPlaceRooms] = createSignal(0);

  const [numberOfCorridors, setNumberOfCorridors] = createSignal(0);
  const [hasPlacedCorridors, setHasPlacedCorridors] = createSignal(false);
  const [timeToPlaceCorridors, setTimeToPlaceCorridors] = createSignal(0);

  const [playerStartingPosition, setPlayerStartingPosition] = createSignal<Coords>({x: -1, y: -1});

  const emptyGrid = getEmptyGrid();
  const [grid, setGrid] = createSignal<Grid>(emptyGrid);
  const [pathfinder, setPathfinder] = createSignal<Pathfinder>(getEmptyPathfinder());

  const [unreachableCell, setUnreachableCell] = createSignal<GridCell | null>(null);

  const [player, setPlayer] = createSignal(getPlayer(emptyGrid, {x: -1, y: -1}));

  const [canMove, setCanMove] = createSignal(true);
  const [clicked, setClicked] = createSignal(false);

  const [gridCells, setGridCells] = createSignal<GridCell[][]>([]);

  const [isPlayerMoving, setIsPlayerMoving] = createSignal(false);

  onMount(async () => {
    // Create the actual grid:
    const generatedGrid = await getSquareGrid(mapWidth);

    // Generate and place rooms:
    const startRooms = Date.now();
    const generatedRooms = await generateRooms(mapWidth, minRoomWidth, maxRoomWidth, 2);
    setNumberOfRooms(generatedRooms.length);
    setHasPlacedRooms(await generatedGrid.placeRooms(generatedRooms));
    const endRooms = Date.now();
    setTimeToPlaceRooms(endRooms - startRooms);

    // Generate and set player position:
    const randomRoomIndex = randomInt(0, generatedRooms.length);
    const generatedPlayerStartingPosition = generatePlayerStartingPosition(generatedRooms[randomRoomIndex]);
    setPlayerStartingPosition(generatedPlayerStartingPosition);


    // Generate and place corridors:
    const startCorridors = Date.now();
    const generatedCorridors = await generateCorridors(generatedRooms, mapWidth);
    setNumberOfCorridors(generatedCorridors.length);
    setHasPlacedCorridors(await generatedGrid.placeCorridors(generatedCorridors));
    const endCorridors = Date.now();
    setTimeToPlaceCorridors(endCorridors - startCorridors);

    // Set the player, the grid, and the pathfinder
    setGrid(generatedGrid);
    setPathfinder(getPathfinder(generatedGrid, (element: PathfinderCell) => element.f));
    setPlayer(getPlayer(generatedGrid, generatedPlayerStartingPosition));

    setGridCells(generatedGrid.cells);
  });

  const movePlayerToCell = async (cell: GridCell) => {
    // TODO: remove this atrocity once I've figured out why the heck the grid isn't updating:
    setClicked(true);
    const atrocity = setInterval(() => setClicked(!clicked()), 10);
    pathfinder().reset();

    if (isPlayerMoving()) {
      // TODO: stop player from moving in the initial direction.
      player().isChangingDirection = true;
      setIsPlayerMoving(false);
    }

    // TODO: re-enable after I fix the double slit experiment going on here.
    // if (!canMove()) {
    //   return;
    // }
    //
    // setCanMove(false);
    // // Prevent setting move targets instantly after each other.
    // setTimeout(() => setCanMove(true), 25);

    const path = pathfinder().tracePath(grid().getCellAt(player().x, player().y), cell);

    if (path.length) {
      setIsPlayerMoving(true);
      const dt = Date.now();
      await player().takePath(path, true);
      console.log(`Moved player in ${Date.now() - dt}ms.`);
      setIsPlayerMoving(false);
      setGridCells(player().grid.cells);
      setClicked(false);
    } else {
      setGridCells(player().grid.cells);
      setUnreachableCell(cell);
      setTimeout(() => {
        setUnreachableCell(null);
        setClicked(false);
      }, 1000);
    }

    // TODO: other end of the atrocity to clean up.
    setTimeout(() => clearInterval(atrocity), 10000);
  };

  createEffect(() => {
    console.log('Player coords: ');
    console.log(player().x, player().y);
    console.log('End player coords');
    console.log(grid().getCellAt(player().x, player().y).status);
  });

  const roomsJsx = <h1>Finished generating a {mapWidth}x{mapWidth} map,
    placing {numberOfRooms()} rooms in {timeToPlaceRooms()}ms.</h1>;
  const playerJsx = <h1>Player starting position: ({playerStartingPosition().x}, {playerStartingPosition().y}).</h1>;
  const corridorsJsx = <h1>Finished placing {numberOfCorridors()} corridors in {timeToPlaceCorridors()}ms.</h1>;
  const cellsJsx = <For each={gridCells()}>{cellRow =>
    <div class={'flex'}>
      <For each={cellRow}>{(cell) =>
        <div onClick={() => movePlayerToCell(cell)}
          data-clicked={clicked()}
          data-xCoord={cell.x}
          data-yCoord={cell.y}
          data-roomId={cell.roomId}
          data-cellStatus={cell.status}
          style={{
            width: `${CELL_WIDTH}px`,
            height: `${CELL_WIDTH}px`,
            'box-shadow': `inset 0 0 0 ${CELL_BORDER_WIDTH}px rgb(250 204 21)`,
            // transition: 'all 500ms',
          }}
          class={'rounded-sm flex items-center justify-center hover:brightness-125 cursor-pointer'}
          classList={{
            'bg-slate-500': grid().cells[cell.y][cell.x].status === CellStatus.OBSTACLE,
            'bg-yellow-500': grid().cells[cell.y][cell.x].status === CellStatus.EMPTY,
            'bg-green-500': grid().cells[cell.y][cell.x].status === CellStatus.PLAYER,
            'bg-teal-500': grid().cells[cell.y][cell.x].status === CellStatus.VISITED,
            'bg-red-500': unreachableCell() === cell,
          }}
        >
          {/*TODO: add a "debugMode" variable to enable this thing, maybe other debugging stuff as well.*/}
          {/*<small class={'text-xs'}>{cell.x},{cell.y}</small>*/}
        </div>
      }</For>
    </div>
  }</For>;

  // TODO:
  //  1. Use Tailwind classes everywhere.
  //  2. After fixing the points above, implement the Player and the Pathfinder algorithm.
  //  3. Implement tests.
  return (
    <div class={'text-center mt-14'}>
      <Show when={hasPlacedRooms()} fallback={<h1>Generating {mapWidth}x{mapWidth} map…</h1>}>
        {roomsJsx}
      </Show>
      <Show when={hasPlacedRooms() && playerStartingPosition().x > -1} fallback={<h1>Placing player…</h1>}>
        {playerJsx}
      </Show>
      <Show when={hasPlacedCorridors()} fallback={<h1>Generating corridors…</h1>}>
        {corridorsJsx}
      </Show>
      <Show when={gridCells().length > 0} fallback={<h1>Generating cells…</h1>}>
        <div class={'inline-block mt-12'}
          style={{
            width: `${gridCells().length * (CELL_WIDTH)}px`,
            height: `${gridCells().length * (CELL_WIDTH)}px`,
            'background-color': '#000',
          }}>
          {cellsJsx}
        </div>
      </Show>
    </div>
  );
}
