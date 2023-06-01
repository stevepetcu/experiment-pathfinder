import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import {UUID} from 'crypto';
import * as PIXI from 'pixi.js';
import {AnimatedSprite, BLEND_MODES, Graphics, MSAA_QUALITY, Sprite, Texture} from 'pixi.js';
import { createSignal, onCleanup, onMount, Show} from 'solid-js';

import charTextures from '../assets/CharTextures';
import {generateCorridors, generateRandomPosition, generateRooms} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import { DEFAULT_SPEED, getPlayer, Player, Speed} from '../models/Player';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import randomInt from '../utils/RandomInt';
import getSSMB, {ModelUpdateMessage} from '../utils/SimpleSequenceMessageBroker';

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
  // These settings are not user-configurable
  const cellWidth = 50;
  const mapWidth = 50;
  const minRoomWidth = 3;
  const maxRoomWidth = 8;
  const numberOfCritters = 5;
  // End "These settings are not user-configurable"

  const playerSpeed: Speed = {...DEFAULT_SPEED, px: cellWidth}; // TODO: this is pretty atrocious.
  const critterSpeed: Speed = {ms: 1000, px: cellWidth};

  // TODO do I need signals here?
  const [numberOfRooms, setNumberOfRooms] = createSignal(0);
  const [hasPlacedRooms, setHasPlacedRooms] = createSignal(false);
  const [timeToPlaceRooms, setTimeToPlaceRooms] = createSignal(0);

  const [numberOfCorridors, setNumberOfCorridors] = createSignal(0);
  const [hasPlacedCorridors, setHasPlacedCorridors] = createSignal(false);
  const [timeToPlaceCorridors, setTimeToPlaceCorridors] = createSignal(0);

  const [gridCells, setGridCells] = createSignal<GridCell[][]>([]);


  const emptyGrid = getEmptyGrid();
  const [pathfinder, setPathfinder] = createSignal<Pathfinder>(getEmptyPathfinder(emptyGrid));


  const [gridScrollableContainer, setGridScrollableContainer] = createSignal<Element | null>();
  // TODO: end "do I need signals here?"

  let player: Player;
  let playerSprite: AnimatedSprite;
  let characterTextures: CharacterTextureMap;
  const playerCoordObservers: Graphics[] = [];

  const critters: Player[] = [];
  const critterSprites: { id: UUID, sprite: Sprite }[] = [];

  const playerSSMB = getSSMB();
  const critterSSM = getSSMB();

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
    const playerRandomStartingPosition = generateRandomPosition(generatedRooms);

    // Generate and place corridors:
    const startCorridors = Date.now();
    const generatedCorridors = await generateCorridors(generatedRooms, mapWidth);
    setNumberOfCorridors(generatedCorridors.length);
    setHasPlacedCorridors(await generatedGrid.placeCorridors(generatedCorridors));
    const endCorridors = Date.now();
    setTimeToPlaceCorridors(endCorridors - startCorridors);

    // Set the player, the grid, and the pathfinder
    setPathfinder(getPathfinder(generatedGrid, {allowDiagonalMovement: true, returnClosestCellOnPathFailure: true}));

    // TODO: arrange the code a bit better. These guys have to be created after we've added the subscription to
    //  the message broker, lest they get born "inanimate". I must figure out why things break if I move this below.
    player = getPlayer(pathfinder(), playerRandomStartingPosition, playerSSMB);

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
    light.zIndex = 10;
    const light2 = new PIXI.Graphics();
    light2.zIndex = 10;
    const light3 = new PIXI.Graphics();
    light3.zIndex = 10;
    playerCoordObservers.push(light, light2, light3);

    const charLookingAroundTextures = await PIXI.Assets.loadBundle('character-looking-around');
    const charRunningTextures = await PIXI.Assets.loadBundle('character-running');
    characterTextures = charTextures(charLookingAroundTextures, charRunningTextures);
    playerSprite = new PIXI.AnimatedSprite(characterTextures.lookingAround.south, true);

    playerSprite.width = cellWidth;
    playerSprite.height = cellWidth;
    playerSprite.x = (player?.x || -1) * playerSpeed.px;
    playerSprite.y = (player?.y || -1) * playerSpeed.px;
    playerSprite.zIndex = 20;

    container.addChild(playerSprite);

    const critterUIUpdater = (message: ModelUpdateMessage) => {
      if (!message.isAlive) {
        return;
      }

      console.log('Message:');
      console.log(message);

      // Animate player sprite
      critterSprites.map(cs => {
        if (cs.id === message.id) {
          cs.sprite.x = message.x * critterSpeed.px + cellWidth / 4;
          cs.sprite.y = message.y * critterSpeed.px + cellWidth / 4;
        }
      });
    };

    // Generate critters
    // zIndex apparently doesn't matter, so we must add these "below" the fog of way & light layers
    const critterBehaviour = async (critter: Player) => {
      // TODO save these intervals and destroy them on cleanup.
      const randomLocation = generateRandomPosition(generatedRooms);

      await critter.moveTo(generatedGrid.getCellAt(randomLocation.x, randomLocation.y), critterSpeed);

      // Wait 2 seconds after reaching the destination.
      // TODO: extract as a "delay" fn.
      await new Promise(resolve => setTimeout(resolve, 2000));
      await critterBehaviour(critter);
    };

    // TODO: fix the lights not following the player, then add critters back in and fix the rest of the things.
    for (let i = 0; i < numberOfCritters; i++) {
      const critterRandomStartingPosition = generateRandomPosition(generatedRooms);
      const critterPathFinder = getPathfinder(generatedGrid);
      const critter = getPlayer(
        critterPathFinder,
        critterRandomStartingPosition,
        critterSSM,
      );
      critters.push(critter);

      const critterTexture = PIXI.Texture.WHITE;
      const critterSprite = new PIXI.Sprite(critterTexture);
      critterSprite.tint = new PIXI.Color('rgb(255,142,155)');
      critterSprite.width = cellWidth/2;
      critterSprite.height = cellWidth/2;
      critterSprite.x = (critter.x || -1) * critterSpeed.px + cellWidth / 4; // TODO: use the sprite's width here?
      critterSprite.y = (critter.y || -1) * critterSpeed.px + cellWidth / 4;
      critterSprite.zIndex = 10;

      container.addChild(critterSprite);

      critterSprites.push({id: critter.id, sprite: critterSprite});

      critterBehaviour(critter);
    }
    // End "Generate critters"

    light.beginFill();
    light.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, cellWidth * 7.5);
    light.endFill();
    light.blendMode = BLEND_MODES.ERASE;

    fogOfWar.addChild(light);
    fogOfWar.zIndex = 30;
    // container.addChild(fogOfWar);

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

    setGridScrollableContainer(document.getElementById('grid-scrollable-container'));
    // Always keep the character in the center of the scrollable div when it's moving
    // (but allow scrolling inside the div when the character is not moving)
    gridScrollableContainer()?.scroll({
      left: (player?.x || 0) * cellWidth - gridScrollableContainer()!.clientWidth / 2,
      top: (player?.y || 0) * cellWidth - gridScrollableContainer()!.clientHeight / 2,
    });

    const playerUIUpdater = (message: ModelUpdateMessage) => {
      if (!message.isAlive) {
        return;
      }

      console.log('Message:');
      console.log(message);

      // Animate player sprite
      const ms = message.movementState;
      const fps = ms.action === 'running' ? (7 / 20) : (5 / 250); // has to be a multiple of the number of textures.
      playerSprite.textures = characterTextures[ms.action][ms.direction];
      playerSprite.animationSpeed = fps;
      playerSprite.play();
      playerSprite.x = player.x * playerSpeed.px;
      playerSprite.y = player.y * playerSpeed.px;

      // Animate player visibility area/lights
      playerCoordObservers.map(co => {
        // TODO: there is a problem with the vector not updating (particularly when changing direction??) resulting in the
        // light drifting away from the player (I think) – replicate this with no critters present.
        co.x += ms.vectorX * playerSpeed.px;
        co.y += ms.vectorY * playerSpeed.px;
      });

      gridScrollableContainer()?.scroll({
        left: player.x * playerSpeed.px - gridScrollableContainer()!.clientWidth / 2,
        top: player.y * playerSpeed.px - gridScrollableContainer()!.clientHeight / 2,
      });
    };

    playerSSMB.subscribe(playerUIUpdater);
    critterSSM.subscribe(critterUIUpdater); // TODO: subscribe critter ssmb to player updates so we can hunt.
  });

  onCleanup(() => {
    console.debug('Destroying app…');
    pixiApp().stage.destroy({children: true, texture: true, baseTexture: true}); // Should not be needed but…
    pixiApp().destroy(true, {children: true, texture: true, baseTexture: true});
    PIXI.Assets.cache.reset();
    PIXI.Cache.reset();
  });

  // createEffect(() => {
  //   // TODO: FIX - the lights are drifting when the player moves.
  //   //  Is my refresh strategy backfiring or is there some weird interference with the critters?
  //
  //   if (player) {
  //     console.log(gameStateUpdated());
  //     console.log('Movement state:');
  //     console.log(player.movementState);
  //     console.log(`Coordinates: (${player.x}, ${player.y})`);
  //     console.log(`Is changing direction: (${player.isChangingDirection})`);
  //
  //     // Animate player sprite
  //     const ms = player.movementState;
  //     const fps = ms.action === 'running' ? 7 / 20 : 5 / 250; // has to be a multiple of the number of textures.
  //     playerSprite.textures = characterTextures[ms.action][ms.direction];
  //     playerSprite.animationSpeed = fps;
  //     playerSprite.play();
  //     playerSprite.x = player.x * playerSpeed.px;
  //     playerSprite.y = player.y * playerSpeed.px;
  //
  //     // Animate player visibility area/lights
  //     playerCoordObservers.map(co => {
  //       // TODO: there is a problem with the vector not updating (particularly when changing direction??) resulting in the
  //       // light drifting away from the player (I think) – replicate this with no critters present.
  //       co.x += ms.vectorX * playerSpeed.px;
  //       co.y += ms.vectorY * playerSpeed.px;
  //     });
  //   }
  //
  //   if (critterSprites.length) {
  //     // TODO: Why do I need these console logs for stuff to work? :'(
  //     console.log(critterUpdated0());
  //     console.log(critterUpdated1());
  //     critterSprites.map(cs => {
  //       const critter = critters.find(c=>c.id === cs.id);
  //       if (!critter) {
  //         return;
  //       }
  //       cs.sprite.x = critter.x * critterSpeed.px + cellWidth / 4;
  //       cs.sprite.y = critter.y * critterSpeed.px + cellWidth / 4;
  //     });
  //   }
  //
  //   if (gridScrollableContainer()) { // TODO: if I comment this *line* out, the game breaks. Wtf?
  //   // gridScrollableContainer()!.scroll({
  //   //   left: player.x * playerSpeed.px - gridScrollableContainer()!.clientWidth / 2,
  //   //   top: player.y * playerSpeed.px - gridScrollableContainer()!.clientHeight / 2,
  //   // });
  //   }
  // });

  const movePlayerTo = async (cell: GridCell) => {
    if (!player) {
      return;
    }

    //Stop player from moving in the initial direction.
    player!.isChangingDirection = true;

    await player!.moveTo(cell, playerSpeed);
  };

  const roomsJsx = <h2>Finished generating a {mapWidth}x{mapWidth} map,
    placing {numberOfRooms()} rooms in {timeToPlaceRooms()}ms.</h2>;
  const corridorsJsx = <h2>Finished placing {numberOfCorridors()} corridors in {timeToPlaceCorridors()}ms.</h2>;

  // TODO:
  //  1. Use Tailwind classes everywhere.
  //  2. Implement tests.
  return (
    <div class={'text-center mt-14'}>
      <Show when={hasPlacedRooms()} fallback={<h2>Generating {mapWidth}x{mapWidth} map…</h2>}>
        {roomsJsx}
      </Show>
      <Show when={hasPlacedCorridors()} fallback={<h2>Generating corridors…</h2>}>
        {corridorsJsx}
      </Show>
      <h2>The player moves at a fixed speed of 1 block every {playerSpeed.ms}ms.</h2>
      <Show when={gridCells().length > 0 && pixiApp() && pixiApp().view}
        fallback={<h2>Generating cells…</h2>}>
        <div id="grid-scrollable-container"
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
