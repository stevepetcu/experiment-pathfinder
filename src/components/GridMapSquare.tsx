import {createSignal, For, onMount, Show} from 'solid-js';

import {Coords} from '../models/Coords';
import {generateCorridors, generatePlayerStartingPosition, generateRooms} from '../models/Map';
import {CellStatus, getEmptyGrid, getSquareGrid, Grid} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';

interface GridMapSquareProps {
  width?: number;
}

export default function GridMapSquare(props: GridMapSquareProps) {
  const CELL_WIDTH = 20;
  const CELL_BORDER_WIDTH = 1;

  const mapWidth = props.width || 20;

  const [grid, setGrid] = createSignal<Grid>(getEmptyGrid());
  const [hasPlacedRooms, setHasPlacedRooms] = createSignal(false);
  const [hasPlacedCorridors, setHasPlacedCorridors] = createSignal(false);
  const [playerStartingPosition, setPlayerStartingPosition] = createSignal<Coords>({x: -1, y: -1});

  // const [gameGrid, setGameGrid] =

  onMount(async () => {
    // Create the actual grid:
    setGrid(await getSquareGrid(mapWidth));

    console.log(grid().gridCells);

    // Generate and place rooms:
    const generatedRooms = await generateRooms(mapWidth, 2, 5, 2);
    if (grid().gridCells.length > 0) {
      setHasPlacedRooms(await grid().placeRooms(generatedRooms));
    }

    // Generate and set player position:
    const randomRoomIndex = randomInt(0, generatedRooms.length);
    const generatedPlayerStartingPosition = generatePlayerStartingPosition(generatedRooms[randomRoomIndex]);
    setPlayerStartingPosition(generatedPlayerStartingPosition);

    // Generate and place corridors:
    const generatedCorridors = await generateCorridors(generatedRooms, mapWidth);
    if (grid().gridCells.length > 0) {
      setHasPlacedCorridors(await grid().placeCorridors(generatedCorridors));
    }
  });

  const roomsJsx = <h1>Finished generating rooms.</h1>;
  const playerJsx = <h1>Player starting position: ({playerStartingPosition().x}, {playerStartingPosition().y}).</h1>;
  const corridorsJsx = <h1>Finished generating corridors.</h1>;

  // TODO:
  //  1. Make the <For>s update when I set the grid cells.
  //  2. Disconnected rooms are still getting generated; double-check against my original algorithm.
  //  3. Sometimes the app hangs – figure out where and double-check against my original algorithm.
  //  4. Figure out why the map is not centered/2 cells are missing per row.
  //  5. Potentially related to 4. - the map border is not always consistently 2 blocks.
  //  4. Use Tailwind classes everywhere.
  //  5. After fixing the points above, implement the Player and the Pathfinder algorithm.
  //  6. Implement tests.
  return (
    <Show when={hasPlacedRooms() && hasPlacedCorridors()}><>
      <Show when={hasPlacedRooms()} fallback={<h1>Generating rooms…</h1>}>
        {roomsJsx}
      </Show>
      <Show when={hasPlacedRooms() && playerStartingPosition().x > -1} fallback={<h1>Placing player…</h1>}>
        {playerJsx}
      </Show>
      <Show when={hasPlacedCorridors()} fallback={<h1>Generating corridors…</h1>}>
        {corridorsJsx}
      </Show>
      <div class="game-parent"
        style={{
          width: `${grid().gridCells.length * (CELL_WIDTH + 2 * CELL_BORDER_WIDTH)}px`,
          height: `${grid().gridCells.length * (CELL_WIDTH + 2 * CELL_BORDER_WIDTH)}px`,
          'background-color': '#000',
          border: '1px solid red',
        }}>
        <For each={grid().gridCells}>{(cellRow) =>
          <div class={'flex'}>
            <For each={cellRow}>{(cell) =>
              <div data-xCoord={cell.x}
                data-yCoord={cell.y}
                data-roomId={cell.roomId}
                data-cellStatus={cell.status}
                style={{
                  width: `${CELL_WIDTH}px`,
                  height: `${CELL_WIDTH}px`,
                  border: '1px solid goldenrod',
                }}
                classList={{
                  'bg-slate-700': cell.status === CellStatus.OBSTACLE,
                  'bg-yellow-500': cell.status === CellStatus.EMPTY,
                }}
              />
            }</For>
          </div>
        }</For>
      </div>
    </></Show>
  );
}
