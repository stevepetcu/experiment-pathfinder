import { createSignal, For, onMount, Show} from 'solid-js';

import {Coords} from '../models/Coords';
import {generateCorridors, generatePlayerStartingPosition, generateRooms} from '../models/Map';
import {CellStatus, getEmptyGrid, getSquareGrid, Grid} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';

interface GridMapSquareProps {
  width?: number;
  minRoomWidth?: number;
  maxRoomWidth?: number;
}

export default function GridMapSquare(props: GridMapSquareProps) {
  const CELL_WIDTH = 10;
  const CELL_BORDER_WIDTH = 0.25;

  // TODO: pass in from some text fields in the parent. Figure out the default values SolidJS style.
  const mapWidth = props.width || 100;
  const minRoomWidth = props.width || 2;
  const maxRoomWidth = props.width || 8;

  const [grid, setGrid] = createSignal<Grid>(getEmptyGrid());
  const [numberOfRooms, setNumberOfRooms] = createSignal(0);
  const [hasPlacedRooms, setHasPlacedRooms] = createSignal(false);
  const [timeToPlaceRooms, setTimeToPlaceRooms] = createSignal(0);

  const [numberOfCorridors, setNumberOfCorridors] = createSignal(0);
  const [hasPlacedCorridors, setHasPlacedCorridors] = createSignal(false);
  const [timeToPlaceCorridors, setTimeToPlaceCorridors] = createSignal(0);

  const [playerStartingPosition, setPlayerStartingPosition] = createSignal<Coords>({x: -1, y: -1});

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

    setGrid(generatedGrid);
  });

  const roomsJsx = <h1>Finished generating a {mapWidth}x{mapWidth} map,
    placing {numberOfRooms()} rooms in {timeToPlaceRooms()}ms.</h1>;
  const playerJsx = <h1>Player starting position: ({playerStartingPosition().x}, {playerStartingPosition().y}).</h1>;
  const corridorsJsx = <h1>Finished placing {numberOfCorridors()} corridors in {timeToPlaceCorridors()}ms.</h1>;
  const cellsJsx = <For each={grid().gridCells}>{cellRow =>
    <div class={'flex'}>
      <For each={cellRow}>{(cell) =>
        <div data-xCoord={cell.x}
          data-yCoord={cell.y}
          data-roomId={cell.roomId}
          data-cellStatus={cell.status}
          style={{
            width: `${CELL_WIDTH}px`,
            height: `${CELL_WIDTH}px`,
            'box-shadow': `inset 0 0 0 ${CELL_BORDER_WIDTH}px rgb(250 204 21)`,
          }}
          classList={{
            'bg-slate-700': cell.status === CellStatus.OBSTACLE,
            'bg-yellow-500': cell.status === CellStatus.EMPTY,
          }}
        />
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
      <Show when={grid().gridCells.length > 0} fallback={<h1>Generating cells…</h1>}>
        <div class={'inline-block mt-12'}
          style={{
            width: `${grid().gridCells.length * (CELL_WIDTH)}px`,
            height: `${grid().gridCells.length * (CELL_WIDTH)}px`,
            'background-color': '#000',
            border: '1px solid red',
          }}>
          {cellsJsx}
        </div>
      </Show>
    </div>
  );
}
