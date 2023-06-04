import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import {UUID} from 'crypto';
import {
  AlphaFilter,
  AnimatedSprite, Application,
  Assets,
  BLEND_MODES,
  Color, Container,
  Graphics,
  MSAA_QUALITY,
  Sprite, Text,
  Texture,
} from 'pixi.js';
import { createSignal, onCleanup, onMount, Show} from 'solid-js';

import charTextures from '../assets/CharTextures';
import {generateCorridors, generateRandomPosition, generateRooms} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import {DEFAULT_SPEED, getPlayer, Player, Speed} from '../models/Player';
import {getMilkCanBuff, PlayerBuff} from '../models/PlayerBuff';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import {calcDiagonalDistance} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import getSSMB, {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {formatSeconds} from '../utils/Time';

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
  const cellWidth = 45;
  const mapWidth = 50;
  const minRoomWidth = 3;
  const maxRoomWidth = 8;
  const numberOfCritters = 5;
  let spotLightRadius = cellWidth * 6; // TODO: make this smaller on mobile?
  const baseRunningFps = 5/250;
  // End "These settings are not user-configurable"

  const playerSpeed: Speed = {...DEFAULT_SPEED, px: cellWidth}; // TODO: this is pretty atrocious.
  const critterSpeed: Speed = {ms: 500, px: cellWidth};

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

  const [pixiApp] = createSignal<Application>(
    new Application({
      background: 'darkGrey',
      width: mapWidth * cellWidth,
      height: mapWidth * cellWidth,
    }),
  );
  // TODO: end "do I need signals here?"

  let player: Player;
  let playerSprite: AnimatedSprite;
  let characterTextures: CharacterTextureMap;
  const playerCoordObservers: Graphics[] = [];

  const critters: Player[] = [];
  const critterSprites: { id: UUID, sprite: Sprite }[] = [];
  const crittersEaten: Player['id'][] = [];
  let critterBehaviour: (critter:Player) => void;

  const playerBuffs: PlayerBuff[] = [];
  const [buffsJsx, setBuffsJsx] = createSignal(<div/>);
  const [numberOfCrittersEaten, setNumberOfCrittersEaten] = createSignal(0);

  let playTimeTracker: NodeJS.Timer;
  const [playTime, setPlayTime] = createSignal(0);

  const playerSSMB = getSSMB();
  const critterSSMB = getSSMB();

  const [finishedLoading, setFinishedLoading] = createSignal(false);
  const [loadingProgress, setLoadingProgress] = createSignal(0);
  const [isGameStarted, setIsGameStarted] = createSignal(false);

  onMount(async () => {
    const smokeAndMirrorsLoading = async () => {
      const randomWaitTime = randomInt(50, 331);
      const randomProgress = randomInt(1, 4);
      await new Promise(resolve => setTimeout(resolve, randomWaitTime));
      if (!finishedLoading() && loadingProgress() < 96) {
        setLoadingProgress(lp => lp + randomProgress);
        smokeAndMirrorsLoading();
      }
      if (finishedLoading()) {
        setLoadingProgress(100);
        return;
      }
    };

    smokeAndMirrorsLoading();

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

    const container = new Container();

    // Add textures:
    // TODO: sort out the caching issue;
    //  not sure if it's to do w/ files having the same names + it doesn't account for their path, or what.
    await Assets.init({manifest: 'assets/sprite-textures-manifest.json'});
    const tileTextures = await Assets.loadBundle('tiles');

    gridCells().map(row => {
      row.map(cell => {
        const sprite = new Sprite();
        sprite.width = cellWidth;
        // noinspection JSSuspiciousNameCombination
        sprite.height = cellWidth;
        sprite.x = cell.x * cellWidth;
        sprite.y = cell.y * cellWidth;

        // Opt-in to interactivity
        sprite.eventMode = 'dynamic';
        // Shows hand cursor
        sprite.cursor = 'pointer';

        // sprite.on('pointerover', () => {
        //   console.log('hovered');
        //   // TODO: do something to highlight + add some pointer clicked sprite etc.
        // });

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

    const fogOfWar = new Graphics();
    fogOfWar.beginFill('rgb(2, 6, 23)');
    fogOfWar.drawRect(0, 0, pixiApp().view.width, pixiApp().view.height);
    fogOfWar.endFill();
    const filter = new AlphaFilter(0.75);
    fogOfWar.filters = [filter];

    const light = new Graphics();
    const light2 = new Graphics();
    const light3 = new Graphics();
    playerCoordObservers.push(light, light2, light3);

    const charLookingAroundTextures = await Assets.loadBundle('character-looking-around');
    const charRunningTextures = await Assets.loadBundle('character-running');
    characterTextures = charTextures(charLookingAroundTextures, charRunningTextures);
    playerSprite = new AnimatedSprite(characterTextures.lookingAround.south, true);
    playerSprite.animationSpeed = baseRunningFps; // TODO: extract this as a constant.
    playerSprite.play();
    playerSprite.width = cellWidth;
    playerSprite.height = cellWidth;
    playerSprite.x = (player?.x || -1) * playerSpeed.px;
    playerSprite.y = (player?.y || -1) * playerSpeed.px;

    container.addChild(playerSprite);

    const critterUIUpdater = (critterInstance: Player, ssmb: SimpleSequenceMessageBroker) => {
      if (!playerSprite) {
        return;
      }

      const critterSprite = critterSprites.find(cs => cs.id === critterInstance.id);

      if (!critterSprite || critterSprite.sprite.destroyed) {
        return;
      }

      if (!critterInstance.isAlive) {
        // critterSprite.sprite.tint = 'grey';
        critterSprite.sprite.alpha = 0; // TODO: change to "dead" texture?
        ssmb.removeSubscriber(critterInstance.id);
        return;
      }

      // Animate critter sprite
      critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth / 4;
      critterSprite.sprite.y = critterInstance.y * critterSpeed.px + cellWidth / 4;


      // TODO: extract this whole method
      // Update critter visibility
      const distanceToPlayer = calcDiagonalDistance(
        {x: critterSprite.sprite.x, y: critterSprite.sprite.y},
        {x: playerSprite.x, y: playerSprite.y},
      );

      if (distanceToPlayer >= spotLightRadius) {
        critterSprite.sprite.alpha = 0;
        // critterSprite.sprite.tint = 'red';
      }
      if (distanceToPlayer < spotLightRadius) {
        critterSprite.sprite.alpha = 0.35;
        // critterSprite.sprite.tint = 'lime';
      }
      if (distanceToPlayer < spotLightRadius * 0.7) {
        critterSprite.sprite.alpha = 1;
        // critterSprite.sprite.tint = 'yellow';
      }
      if (distanceToPlayer < spotLightRadius * 0.1) {
        // critterSprite.sprite.tint = 'blue';
        critterInstance.setIsAlive(false);
        if (!crittersEaten.includes(critterInstance.id)) {
          crittersEaten.push(critterInstance.id);
          setNumberOfCrittersEaten(n => n + 1);
          playerSpeed.ms = playerSpeed.ms * 0.75;
          light.scale.set(light.scale.x * 1.25, light.scale.y * 1.25);
          light2.scale.set(light2.scale.x * 1.25, light2.scale.y * 1.25);
          light3.scale.set(light3.scale.x * 1.25, light3.scale.y * 1.25);

          spotLightRadius = spotLightRadius * 1.1;

          critterSprite.sprite.destroy();
        }
      }
    };

    const playerUIUpdaterForCritters = (playerInstance: Player, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive) {
        return;
      }

      for (let i = 0; i < critters.length; i++) {
        const critterInstance = critters[i];

        if (!critterInstance || !critterInstance.isAlive) {
          continue;
        }

        const critterSprite = critterSprites.find(cs => cs.id === critterInstance.id);

        if (!critterSprite || critterSprite.sprite.destroyed) {
          return;
        }

        // TODO: extract this whole method
        // Make  critter sprite visible
        const distanceToPlayer = calcDiagonalDistance(
          {x: critterSprite.sprite.x, y: critterSprite.sprite.y},
          {x: playerInstance.x * playerSpeed.px, y: playerInstance.y * playerSpeed.px},
        );

        if (distanceToPlayer >= spotLightRadius) {
          critterSprite.sprite.alpha = 0;
          // critterSprite.sprite.tint = 'red';
        }
        if (distanceToPlayer < spotLightRadius) {
          critterSprite.sprite.alpha = 0.35;
          // critterSprite.sprite.tint = 'lime';
        }
        if (distanceToPlayer < spotLightRadius * 0.7) {
          critterSprite.sprite.alpha = 1;
          // critterSprite.sprite.tint = 'yellow';
        }
        if (distanceToPlayer < spotLightRadius * 0.1) {
          // critterSprite.sprite.tint = 'blue';
          if (!crittersEaten.includes(critterInstance.id)) {
            critterInstance.setIsAlive(false);
            crittersEaten.push(critterInstance.id);
            // Could also be "setNumberOfCrittersEaten(n => ++n);"
            // or "setNumberOfCrittersEaten(crittersEaten.length);" but not
            // setNumberOfCrittersEaten(n => n++); - b/c n++ returns before it adds? Spent 30 min debugging that 💩.
            setNumberOfCrittersEaten(n => n + 1);
            playerSpeed.ms = playerSpeed.ms * 0.75;
            light.scale.set(light.scale.x * 1.25, light.scale.y * 1.25);
            light2.scale.set(light2.scale.x * 1.25, light2.scale.y * 1.25);
            light3.scale.set(light3.scale.x * 1.25, light3.scale.y * 1.25);

            spotLightRadius = spotLightRadius * 1.25;

            critterSprite.sprite.destroy();
          }
        }
      }
    };

    // Generate critters
    // zIndex apparently doesn't matter, so we must add these "below" the fog of way & light layers
    critterBehaviour = async (critter: Player) => {
      if (!critter.isAlive) {
        return;
      }

      const randomLocation = generateRandomPosition(generatedRooms);

      await critter.moveTo(generatedGrid.getCellAt(randomLocation.x, randomLocation.y), critterSpeed);

      // Wait 2 seconds after reaching the destination.
      // TODO: extract as a "delay" fn.
      await new Promise(resolve => setTimeout(resolve, 2000));
      await critterBehaviour(critter);
    };

    for (let i = 0; i < numberOfCritters; i++) {
      const critterRandomStartingPosition = generateRandomPosition(generatedRooms);
      const critterPathFinder = getPathfinder(generatedGrid);
      const critter = getPlayer(
        critterPathFinder,
        critterRandomStartingPosition,
        critterSSMB,
      );

      critters.push(critter);

      const critterTexture = Texture.WHITE;
      const critterSprite = new Sprite(critterTexture);
      critterSprite.tint = new Color('rgb(255,142,155)');
      critterSprite.width = cellWidth / 2;
      critterSprite.height = cellWidth / 2;
      critterSprite.x = (critter.x || -1) * critterSpeed.px + cellWidth / 4; // TODO: use the sprite's width here?
      critterSprite.y = (critter.y || -1) * critterSpeed.px + cellWidth / 4;
      critterSprite.alpha = 0;

      const text = new Text(i, {fontSize: 10, align: 'center'});
      text.x = critterSprite.width / 5;
      text.y = critterSprite.width / 8;

      critterSprite.addChild(text);

      container.addChild(critterSprite);

      critterSprites.push({id: critter.id, sprite: critterSprite});

      critterSSMB
        .addSubscriber({subscriptionId: critter.id, callback: critterUIUpdater});
    }
    // End "Generate critters"

    // Add can of milk
    const buffTextures = await Assets.loadBundle('buffs');
    const randomMilkCanPosition = generateRandomPosition(generatedRooms);
    const canOfMilkSprite = new Sprite(buffTextures['milk']);
    canOfMilkSprite.width = cellWidth/2;
    canOfMilkSprite.height = cellWidth/2;
    canOfMilkSprite.x = randomMilkCanPosition.x * cellWidth + cellWidth/4;
    canOfMilkSprite.y = randomMilkCanPosition.y * cellWidth + cellWidth/4;
    canOfMilkSprite.alpha = 0;

    container.addChild(canOfMilkSprite);
    // End "Add can of milk"

    light.beginFill();
    light.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, spotLightRadius);
    light.endFill();
    light.pivot.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    light.position.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    light.blendMode = BLEND_MODES.ERASE;

    fogOfWar.addChild(light);
    container.addChild(fogOfWar);

    const light2Opts = {
      type: ColorGradientFilter.RADIAL,
      stops: [
        {offset: 0, color: 'rgb(227,165,8)', alpha: 0.25},
        {offset: 0.125, color: 'rgb(0, 0, 0)', alpha: 1},
      ],
      alpha: 1,
    };

    light2.beginFill();
    light2.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, spotLightRadius);
    light2.endFill();
    light2.pivot.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    light2.position.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    const gradientLight2 = new ColorGradientFilter(light2Opts);
    gradientLight2.blendMode = BLEND_MODES.SCREEN;
    gradientLight2.multisample = MSAA_QUALITY.HIGH;
    light2.filters = [gradientLight2];

    container.addChild(light2);

    const light3Opts = {
      type: ColorGradientFilter.RADIAL,
      stops: [
        {offset: 0, color: 'rgb(256, 256, 256)', alpha: 1},
        {offset: 0.65, color: 'rgb(244,221,203)', alpha: 1},
        {offset: 0.95, color: 'rgb(95, 80, 68)', alpha: 1},
        {offset: 1, color: 'rgb(63,77,135)', alpha: 1},
      ],
      alpha: 1,
    };

    light3.beginFill();
    light3.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, spotLightRadius);
    light3.endFill();
    light3.pivot.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    light3.position.set(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2);
    const gradientLight3 = new ColorGradientFilter(light3Opts);
    gradientLight3.blendMode = BLEND_MODES.MULTIPLY;
    gradientLight3.multisample = MSAA_QUALITY.HIGH;
    light3.filters = [gradientLight3];

    container.addChild(light3);

    pixiApp().stage.addChild(container);

    setGridScrollableContainer(document.getElementById('grid-scrollable-container'));

    const playerUIUpdater = (playerInstance: Player, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerSprite || !playerInstance.isAlive) {
        return;
      }

      // Animate player sprite
      const ms = playerInstance.movementState;
      const runningFpsDivider = numberOfCrittersEaten() === 0 ? 1 : 5 * numberOfCrittersEaten();
      const fps = ms.action === 'running' ? 7/20 : baseRunningFps/runningFpsDivider; // has to be a multiple of the number of textures.
      playerSprite.textures = characterTextures[ms.action][ms.direction];
      playerSprite.animationSpeed = fps;
      playerSprite.play();
      playerSprite.x = player.x * playerSpeed.px;
      playerSprite.y = player.y * playerSpeed.px;

      // Animate player visibility area/lights
      playerCoordObservers.forEach(co => {
        co.x += ms.vectorX * playerSpeed.px;
        co.y += ms.vectorY * playerSpeed.px;
      });


      if (!canOfMilkSprite.destroyed) {
        const distanceToPlayer = calcDiagonalDistance(
          {x: canOfMilkSprite.x, y: canOfMilkSprite.y},
          {x: playerInstance.x * playerSpeed.px, y: playerInstance.y * playerSpeed.px},
        );
        if (distanceToPlayer >= spotLightRadius) {
          canOfMilkSprite.alpha = 0;
        }
        if (distanceToPlayer < spotLightRadius) {
          canOfMilkSprite.alpha = 0.35;
        }
        if (distanceToPlayer < spotLightRadius * 0.7) {
          canOfMilkSprite.alpha = 1;
        }
        // TODO: consider using sprite's bounds intersection/hit boxes?
        if (distanceToPlayer < spotLightRadius * 0.1) {
          const milkBuff = getMilkCanBuff();
          playerBuffs.push(milkBuff);
          setBuffsJsx(playerBuffs.map(buff => {
            return <img src={buff.spriteImage} alt={`${buff.affects} buff`}
              class={'width-[30px] height-[30px]'}
            />;
          }));
          // TODO: Consider adding critters eaten as buffs (or 1 incremental buff),
          //  alongside this buff and calculating the speed of the player dynamically based on the buffs.
          //  This would enable us to remove buffs easily, as well as adding new ones.
          playerSpeed.ms *= milkBuff.magnitude;

          canOfMilkSprite.destroy();
        }
      }

      gridScrollableContainer()?.scroll({
        left: player.x * playerSpeed.px - gridScrollableContainer()!.clientWidth / 2,
        top: player.y * playerSpeed.px - gridScrollableContainer()!.clientHeight / 2,
      });
    };

    playerSSMB
      .addSubscriber({subscriptionId: player.id, callback: playerUIUpdater})
      .addSubscriber({subscriptionId: player.id, callback: playerUIUpdaterForCritters});

    setFinishedLoading(true);
  });

  onCleanup(() => {
    console.debug('Destroying app…');
    pixiApp().stage.destroy({children: true, texture: true, baseTexture: true}); // Should not be needed but…
    pixiApp().destroy(true, {children: true, texture: true, baseTexture: true});
  });

  const startGame = () => {
    if (!finishedLoading()) {
      return;
    }

    for (const critter of critters) {
      critterBehaviour(critter);
    }

    setIsGameStarted(true);
    playTimeTracker = setInterval(() => {
      if (numberOfCrittersEaten() !== numberOfCritters) {
        setPlayTime(pt => pt + 1);
      } else {
        clearInterval(playTimeTracker);
      }
    }, 1000);

    // Always keep the character in the center of the scrollable div when it's moving
    // (but allow scrolling inside the div when the character is not moving)
    gridScrollableContainer()?.scroll({
      left: (player?.x || 0) * cellWidth - gridScrollableContainer()!.clientWidth / 2,
      top: (player?.y || 0) * cellWidth - gridScrollableContainer()!.clientHeight / 2,
    });
  };

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
    <div class={'text-center'}>
      <Show when={false}> {/*TODO: these will be in the "debug" menu.*/}
        <Show when={hasPlacedRooms()} fallback={<h2>Generating {mapWidth}x{mapWidth} map…</h2>}>
          {roomsJsx}
        </Show>
        <Show when={hasPlacedCorridors()} fallback={<h2>Generating corridors…</h2>}>
          {corridorsJsx}
        </Show>
        <h2>The player moves at a fixed speed of 1 block every {playerSpeed.ms}ms.</h2>
      </Show>
      <div class={'relative inline-block'}>
        {
          numberOfCrittersEaten() === numberOfCritters &&
          <>
            <div class={'absolute top-0 left-0 w-full h-full z-10 '}
              style={'-webkit-box-shadow: inset 0px 0px 90px 150px rgba(0,0,0,0.5); ' +
                   '-moz-box-shadow: inset 0px 0px 90px 150px rgba(0,0,0,0.5); ' +
                   'box-shadow: inset 0px 0px 90px 150px rgba(0,0,0,0.5);'}/>
            <div class={'absolute top-0 left-0 bg-slate-800/75 w-full h-full ' +
              'grid grid-cols-1 gap-8 content-center z-30 '}>
              <p class={'text-2xl sm:text-3xl md:text-5xl font-bold leading-none text-white antialiased'}>
                Congrats, you're full! *burp*
              </p>
              <button class="bg-slate-100 hover:bg-white text-slate-800 font-semibold
                py-5 px-6 border border-gray-400 rounded-2xl shadow inline m-auto min-w-fit
                text-xl md:text-2xl"
              onClick={() => location.reload()}>Play again
              </button>
            </div>
          </>
        }
        <div id="grid-scrollable-container"
          class={'inline-block w-screen h-screen shadow-2xl'}
          classList={{
            'overflow-auto': isGameStarted(),
            'overflow-hidden': !isGameStarted(),
          }}
        >
          {
            (!finishedLoading() || !isGameStarted()) &&
            <div onClick={() => startGame()}
              class={'bg-slate-800 h-full w-full ' +
              'grid grid-cols-1 gap-8 content-center z-30 '}
              classList={{
                'cursor-wait': !finishedLoading(),
                'cursor-pointer': finishedLoading(),
              }}
            >
              {
                !finishedLoading() &&
                <>
                  <p class={'text-2xl sm:text-3xl md:text-5xl font-bold ' +
                  'leading-none text-white antialiased'}>Loading…</p>
                  <p class={'text-xl sm:text-2xl md:text-4xl ' +
                'leading-none text-white antialiased'}>{loadingProgress()}%</p>
                </>
              }
              {
                finishedLoading() &&
                <p class={'text-2xl sm:text-3xl md:text-5xl font-bold ' +
                  'leading-none text-white antialiased'}>Click anywhere to start</p>
              }
            </div>
          }
          {
            finishedLoading() && isGameStarted() &&
            <>
              <div class={'absolute top-6 left-9 text-left z-20'}>
                <div>
                  <p class={'text-sm sm:text-base md:text-xl font-bold leading-none text-white'}>
                    Time played: {formatSeconds(playTime())}
                  </p>
                </div>
                <div class={'flex flex-wrap gap-x-4 gap-y-5'}>
                  <p class={'text-xl sm:text-2xl md:text-3xl font-bold leading-none text-white'}>
                    Blobfish eaten: {numberOfCrittersEaten()}/{numberOfCritters}
                  </p>
                  <p class={'text-xl sm:text-2xl md:text-3xl font-bold leading-none ' +
                    'text-white'}>
                    Buffs:
                  </p>
                  {buffsJsx()}
                </div>
              </div>
              <div style={{
                width: `${mapWidth * cellWidth}px`,
                height: `${mapWidth * cellWidth}px`,
              }}>
                {pixiApp().view as unknown as Element}
              </div>
            </>
          }
        </div>
      </div>
    </div>
  );
}
