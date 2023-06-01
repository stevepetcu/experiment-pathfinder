import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import * as PIXI from 'pixi.js';
import {BLEND_MODES, MSAA_QUALITY, Texture} from 'pixi.js';
import {createEffect, createSignal, onCleanup, onMount, Show} from 'solid-js';

import charTextures from '../assets/CharTextures';
import {Coords} from '../models/Coords';
import {generateCorridors, generatePlayerStartingPosition, generateRooms} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import {DEFAULT_SPEED, getPlayer, Player, Speed} from '../models/Player';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';

// interface GridMapSquareProps {
//   // TODO: add props
// }

export interface CharacterTextureMap {
  lookingAround: {
    north: Texture[],
    northeast: Texture[],
    east: Texture[],
    southeast: Texture[],
    south: Texture[],
    southwest: Texture[],
    west: Texture[],
    northwest: Texture[],
  },
  running: {
    north: Texture[],
    northeast: Texture[],
    east: Texture[],
    southeast: Texture[],
    south: Texture[],
    southwest: Texture[],
    west: Texture[],
    northwest: Texture[],
  }
}

export default function GridMapSquarePixi() {
  const cellWidth = 50;
  const mapWidth = 50;
  const minRoomWidth = 3;
  const maxRoomWidth = 8;

  const playerSpeed: Speed = {...DEFAULT_SPEED, px: cellWidth}; // TODO: this is pretty atrocious.

  const [numberOfRooms, setNumberOfRooms] = createSignal(0);
  const [hasPlacedRooms, setHasPlacedRooms] = createSignal(false);
  const [timeToPlaceRooms, setTimeToPlaceRooms] = createSignal(0);

  const [numberOfCorridors, setNumberOfCorridors] = createSignal(0);
  const [hasPlacedCorridors, setHasPlacedCorridors] = createSignal(false);
  const [timeToPlaceCorridors, setTimeToPlaceCorridors] = createSignal(0);


  const [playerStartingPosition, setPlayerStartingPosition] = createSignal<Coords>({x: -1, y: -1});

  const emptyGrid = getEmptyGrid();
  // const [grid, setGrid] = createSignal<Grid>(emptyGrid);
  const [pathfinder, setPathfinder] = createSignal<Pathfinder>(getEmptyPathfinder(emptyGrid));

  // const [unreachableCell, setUnreachableCell] = createSignal<GridCell | null>(null);

  const [gridScrollableContainer, setGridScrollableContainer] = createSignal<Element | null>();

  const [player, setPlayer] = createSignal<Player>();

  const [gridCells, setGridCells] = createSignal<GridCell[][]>([]);

  // const [isPlayerMoving, setIsPlayerMoving] = createSignal(false);

  // const [timeToTracePath, setTimeToTracePath] = createSignal<number | null>(null); // TODO

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
    setPathfinder(getPathfinder(generatedGrid, {allowDiagonalMovement: true, returnClosestCellOnPathFailure: true}));

    setGridCells(generatedGrid.cells);

    const container = new PIXI.Container();

    // Add textures:
    // TODO: sort out the caching issue;
    //  not sure if it's to do w/ files having the same names + it doesn't account for their path, or what.
    await PIXI.Assets.init({manifest: 'assets/sprite-textures-manifest.json'});
    const tileTextures = await PIXI.Assets.loadBundle('tiles');

    gridCells().map(row => {
      row.map(cell => {
        const sprite = new PIXI.Sprite();
        sprite.width = cellWidth;
        // noinspection JSSuspiciousNameCombination
        sprite.height = cellWidth;
        sprite.x = cell.x * cellWidth;
        sprite.y = cell.y * cellWidth;
        sprite.zIndex = 1;

        // Opt-in to interactivity
        sprite.eventMode = 'dynamic';
        // Shows hand cursor
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', () => {
          movePlayerTo(cell);
        });

        if (cell.status === CellStatus.OBSTACLE) {
          const randomWallTileTextureIndex = randomInt(0, 5);

          sprite.texture = tileTextures[`tile-wall-${randomWallTileTextureIndex}`];
        }
        if (cell.status !== CellStatus.OBSTACLE) {
          const randomPathTileTextureIndex = randomInt(0, 6);

          sprite.texture = tileTextures[`tile-path-${randomPathTileTextureIndex}`];

          // sprite.tint = new PIXI.Color('rgb(234 179 8)');
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

    const light = new PIXI.Graphics();
    const light2 = new PIXI.Graphics();
    const light3 = new PIXI.Graphics();

    setGridScrollableContainer(document.getElementById('grid-scrollable-container'));

    const charLookingAroundTextures = await PIXI.Assets.loadBundle('character-looking-around');
    const charRunningTextures = await PIXI.Assets.loadBundle('character-running');
    const textures = charTextures(charLookingAroundTextures, charRunningTextures);
    const playerSprite = new PIXI.AnimatedSprite(textures.lookingAround.south, true);

    setPlayer(getPlayer(
      pathfinder(),
      generatedPlayerStartingPosition,
      playerSprite,
      [light, light2, light3],
      textures,
      gridScrollableContainer(),
    ));

    // Always keep the character in the center of the scrollable div when it's moving
    // (but allow scrolling inside the div when the character is not moving)
    gridScrollableContainer()?.scroll({
      left: (player()?.x || 0) * cellWidth - gridScrollableContainer()!.clientWidth / 2,
      top: (player()?.y || 0) * cellWidth - gridScrollableContainer()!.clientHeight / 2,
    });

    playerSprite.width = cellWidth;
    playerSprite.height = cellWidth;
    playerSprite.x = (player()?.x || -1) * cellWidth;
    playerSprite.y = (player()?.y || -1) * cellWidth;
    playerSprite.zIndex = 10;

    container.addChild(playerSprite);

    light.beginFill();
    light.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 7.5);
    light.endFill();
    light.blendMode = BLEND_MODES.ERASE;

    fogOfWar.addChild(light);
    container.addChild(fogOfWar);

    const light2Opts = {
      type: ColorGradientFilter.RADIAL,
      stops: [
        {offset: 0, color: 'rgb(33,211,18)', alpha: 0.35},
        {offset: 0.2, color: 'rgb(0, 0, 0)', alpha: 1},
      ],
      alpha: 1,
    };

    light2.beginFill();
    light2.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 7.5);
    light2.endFill();
    const gradientLight2 = new ColorGradientFilter(light2Opts);
    gradientLight2.blendMode = BLEND_MODES.SCREEN;
    gradientLight2.multisample = MSAA_QUALITY.HIGH;
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
    light3.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 7.5);
    light3.endFill();
    const gradientLight3 = new ColorGradientFilter(light3Opts);
    gradientLight3.blendMode = BLEND_MODES.MULTIPLY;
    gradientLight3.multisample = MSAA_QUALITY.HIGH;
    light3.filters = [gradientLight3];

    container.addChild(light3);

    pixiApp().stage.addChild(container);
  });

  onCleanup(() => {
    console.debug('Destroying app…');
    pixiApp().stage.destroy({children: true, texture: true, baseTexture: true}); // Should not be needed but…
    pixiApp().destroy(true, {children: true, texture: true, baseTexture: true});
    PIXI.Assets.cache.reset();
    PIXI.Cache.reset();
  });

  createEffect(() => {
    console.log('Movement state:');
    console.log(player()?.movementState);
    console.log(`Coordinates: (${player()?.x}, ${player()?.y})`);
    console.log(`Is changing direction: (${player()?.isChangingDirection})`);
  });

  const movePlayerTo = async (cell: GridCell) => {
    if (!player()) {
      return;
    }

    //Stop player from moving in the initial direction.
    player()!.isChangingDirection = true;

    await player()!.moveTo(cell, playerSpeed);

    // setPlayer(player()?.clone());
  };

  const roomsJsx = <h2>Finished generating a {mapWidth}x{mapWidth} map,
    placing {numberOfRooms()} rooms in {timeToPlaceRooms()}ms.</h2>;
  const playerJsx = <h2>Player starting position: ({playerStartingPosition().x}, {playerStartingPosition().y}).</h2>;
  const corridorsJsx = <h2>Finished placing {numberOfCorridors()} corridors in {timeToPlaceCorridors()}ms.</h2>;

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
      <h2>The player moves at a fixed speed of 1 block every {playerSpeed.ms}ms.</h2>
      <Show when={gridCells().length > 0 && pixiApp() && pixiApp().view}
        fallback={<h2>Generating cells…</h2>}>
        <div id='grid-scrollable-container'
          class={'overflow-auto inline-block mt-12 ' +
          'max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-6xl ' +
          'max-h-[500px] md:max-h-[800px]'}>
          <div style={{
            width: `${gridCells().length * (cellWidth)}px`,
            height: `${gridCells().length * (cellWidth)}px`,
            'background-color': '#000',
          }}>
            {pixiApp().view as unknown as Element}
          </div>
        </div>
      </Show>
    </div>
  );
}
