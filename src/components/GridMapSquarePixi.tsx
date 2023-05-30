import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import * as PIXI from 'pixi.js';
import {BLEND_MODES, Texture} from 'pixi.js';
import {createSignal, onCleanup, onMount, Show} from 'solid-js';

import {Coords} from '../models/Coords';
import {generateCorridors, generatePlayerStartingPosition, generateRooms} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder, PathfinderCell} from '../models/Pathfinder';
import {DEFAULT_SPEED, getPlayer, Speed} from '../models/Player';
import {CellStatus, getEmptyGrid, getSquareGrid, Grid, GridCell} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';

interface GridMapSquareProps {
  width?: number;
  minRoomWidth?: number;
  maxRoomWidth?: number;
}

export default function GridMapSquarePixi(props: GridMapSquareProps) {
  const CELL_BORDER_WIDTH = 0.25;

  const cellWidth = Math.max(20, Math.min(36, Math.floor((props.width || 0) / 40)));

  console.log(cellWidth);

  // TODO: pass in props from some text fields in the parent. Figure out the default values SolidJS style.
  //  - mapWidth, minRoomWidth/maxRoomWidth, heuristics, speed etc.
  const mapWidth = Math.min(Math.floor((props.width || 0) / cellWidth), 50);
  const minRoomWidth = props.minRoomWidth || Math.ceil(mapWidth / 20) + 1;
  const maxRoomWidth = props.maxRoomWidth || Math.ceil(mapWidth / 10) + 1;

  const playerSpeed: Speed = {...DEFAULT_SPEED, px: cellWidth}; // TODO: this is pretty atrocious.

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

  // TODO: I think I should first load the assets.
  const lookingAroundDownImagesTextureArray = [
    Texture.from('assets/character/looking_around_s_0.png'),
    Texture.from('assets/character/looking_around_s_2.png'),
    Texture.from('assets/character/looking_around_s_4.png'),
    Texture.from('assets/character/looking_around_s_3.png'),
    Texture.from('assets/character/looking_around_s_1.png'),
  ];

  const playerSprite = new PIXI.AnimatedSprite(lookingAroundDownImagesTextureArray, true);

  playerSprite.animationSpeed = 30;
  playerSprite.play();

  // const playerSprite = new PIXI.Sprite();

  const [player, setPlayer] = createSignal(getPlayer(
    emptyGrid,
    {x: -1, y: -1},
    playerSprite,
    [],
  ));

  const [gridCells, setGridCells] = createSignal<GridCell[][]>([]);

  // const [isPlayerMoving, setIsPlayerMoving] = createSignal(false);

  const [timeToTracePath, setTimeToTracePath] = createSignal<number | null>(null);

  const [pixiApp] = createSignal<PIXI.Application>(
    new PIXI.Application({
      background: 'darkGrey',
      width: mapWidth * cellWidth,
      height: mapWidth * cellWidth,
    }),
  );

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

    setGridCells(generatedGrid.cells);

    const container = new PIXI.Container();
    // pixiApp().stage.addChild(container);

    gridCells().map(row => {
      row.map(cell => {
        const sprite = new PIXI.Sprite();
        sprite.width = cellWidth;
        // noinspection JSSuspiciousNameCombination
        sprite.height = cellWidth;
        sprite.x = cell.x * cellWidth;
        sprite.y = cell.y * cellWidth;
        sprite.zIndex = 1;
        if (cell.status === CellStatus.OBSTACLE) {
          const randomTileTextureNumber = randomInt(0, 5);

          sprite.texture = PIXI.Texture.from(`assets/tiles/wall_${randomTileTextureNumber}.png`);
        }
        if (cell.status !== CellStatus.OBSTACLE) {
          const randomTileTextureNumber = randomInt(0, 6);

          sprite.texture = PIXI.Texture.from(`assets/tiles/path_${randomTileTextureNumber}.png`);
          // sprite.tint = new PIXI.Color('rgb(234 179 8)');

          // Opt-in to interactivity
          sprite.eventMode = 'dynamic';
          // Shows hand cursor
          sprite.cursor = 'pointer';
          sprite.on('pointerdown', () => {
            movePlayerToCell(cell);
          });
        }

        container.addChild(sprite);
      });
    });

    const fogOfWar = new PIXI.Graphics();
    fogOfWar.beginFill(0x000000);
    fogOfWar.drawRect(0, 0, pixiApp().view.width, pixiApp().view.height);
    fogOfWar.endFill();
    const filter = new PIXI.AlphaFilter(0.95);
    fogOfWar.filters = [filter];

    // container.filters = [new ColorGradientFilter(options)];

    const light = new PIXI.Graphics();
    const light2 = new PIXI.Graphics();
    const light3 = new PIXI.Graphics();


    setPlayer(getPlayer(
      generatedGrid,
      generatedPlayerStartingPosition,
      playerSprite,
      [light, light2, light3],
    ));

    playerSprite.width = cellWidth;
    playerSprite.height = cellWidth;
    playerSprite.x = player().x * cellWidth;
    playerSprite.y = player().y * cellWidth;
    playerSprite.zIndex = 10;
    // playerSprite.texture = PIXI.Texture.from('https://s3-us-west-2.amazonaws.com/s.cdpn.io/693612/IaUrttj.png');

    container.addChild(playerSprite);

    light.beginFill();
    light.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 10);
    light.endFill();
    light.blendMode = BLEND_MODES.ERASE;

    fogOfWar.addChild(light);
    container.addChild(fogOfWar);

    const light2Opts = {
      type: ColorGradientFilter.RADIAL,
      stops: [
        {offset: 0.00, color: 'rgb(255,128,67)', alpha: 0.35},
        {offset: 0.5, color: 'rgb(0, 0, 0)', alpha: 1},
      ],
      alpha: 1,
    };

    light2.beginFill();
    light2.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 10);
    light2.endFill();
    const gradientLight2 = new ColorGradientFilter(light2Opts);
    gradientLight2.blendMode = BLEND_MODES.SCREEN;
    light2.filters = [gradientLight2];

    container.addChild(light2);

    const light3Opts = {
      type: ColorGradientFilter.RADIAL,
      stops: [
        {offset: 0, color: 'rgb(256, 256, 256)', alpha: 1},
        {offset: 1, color: 'rgb(18,10,4)', alpha: 1},
      ],
      alpha: 1,
    };

    light3.beginFill();
    light3.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 10);
    light3.endFill();
    const gradientLight3 = new ColorGradientFilter(light3Opts);
    gradientLight3.blendMode = BLEND_MODES.MULTIPLY;
    light3.filters = [gradientLight3];

    container.addChild(light3);

    pixiApp().stage.addChild(container);
  });

  onCleanup(() => {
    console.debug('Destroying app…');
    pixiApp().destroy(true, {children: true, texture: true, baseTexture: true});
  });

  const movePlayerToCell = async (cell: GridCell) => {
    pathfinder().reset();
    //Stop player from moving in the initial direction.
    player().isChangingDirection = true;

    const now = Date.now();
    const path = pathfinder().tracePath(grid().getCellAt(player().x, player().y), cell);
    setTimeToTracePath(Date.now() - now);

    if (path.length) {
      // setIsPlayerMoving(true);
      await player().takePath(path, true, playerSpeed);
      // setIsPlayerMoving(false);
      setGridCells(player().grid.cells);
    } else {
      setGridCells(player().grid.cells);
      setUnreachableCell(cell);
      setTimeout(() => {
        setUnreachableCell(null);
      }, 1000);
    }
  };

  const roomsJsx = <h2>Finished generating a {mapWidth}x{mapWidth} map,
    placing {numberOfRooms()} rooms in {timeToPlaceRooms()}ms.</h2>;
  const playerJsx = <h2>Player starting position: ({playerStartingPosition().x}, {playerStartingPosition().y}).</h2>;
  const corridorsJsx = <h2>Finished placing {numberOfCorridors()} corridors in {timeToPlaceCorridors()}ms.</h2>;
  const tracePathTimeJsx = <h2>Finished tracing last path in {timeToTracePath()}ms.</h2>;

  // TODO:
  //  1. Use Tailwind classes everywhere.
  //  2. Implement tests.
  return (
    <div class={'text-center mt-14'}>
      <Show when={hasPlacedRooms()} fallback={<h2>Generating {mapWidth}x{mapWidth} map…</h2>}>
        {roomsJsx}
      </Show>
      <Show when={hasPlacedRooms() && playerStartingPosition().x > -1} fallback={<h2>Placing player…</h2>}>
        {playerJsx}
      </Show>
      <Show when={hasPlacedCorridors()} fallback={<h2>Generating corridors…</h2>}>
        {corridorsJsx}
      </Show>
      <Show when={timeToTracePath() !== null} fallback={<h2>Waiting for player to move…</h2>}>
        {tracePathTimeJsx}
      </Show>
      <h2>The player moves at a fixed speed of 1 block every {playerSpeed.ms}ms.</h2>
      <Show when={gridCells().length > 0 && pixiApp()} fallback={<h2>Generating cells…</h2>}>
        <div class={'inline-block mt-12'}
          style={{
            width: `${gridCells().length * (cellWidth)}px`,
            height: `${gridCells().length * (cellWidth)}px`,
            'background-color': '#000',
          }}>
          {pixiApp().view}
        </div>
      </Show>
    </div>
  );
}
