import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import {UUID} from 'crypto';
import {
  AlphaFilter,
  AnimatedSprite,
  Application,
  Assets,
  BLEND_MODES,
  Container,
  Graphics,
  MSAA_QUALITY,
  Sprite,
  Texture,
} from 'pixi.js';
import {createEffect, createSignal, JSXElement, onCleanup, onMount, Setter, Show} from 'solid-js';

import {
  CritterTextureMap,
  getCritterTextures, getGhostTextures,
  getPlayerTextures,
  GhostTextureMap,
  PlayerTextureMap,
} from '../assets/CharTextures';
import {Character, getCharacter, MovementDirection, Speed} from '../models/Character';
import {BuffName, CharacterBuff, getBlobfishBuff, getMilkCanBuff} from '../models/CharacterBuff';
import {Coords} from '../models/Coords';
import {
  generateCorridors,
  generateRandomCoordsInRandomRoom, generateRandomCoordsInSpecificRoom,
  generateRooms,
} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import delay from '../utils/Delay';
import {calcDiagonalDistance} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import getSSMB, {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {formatSeconds} from '../utils/Time';
import setVh from '../utils/WindowHeight';
import BuffsDisplay from './BuffsDisplay';
import EnterButton from './EnterButton';
import GameWon from './GameWon';
import styles from './GridMapSquarePixi.module.css';

export default function GridMapSquarePixi(): JSXElement {
  // Override vh property, so it works properly on mobile devices with browser navigation menus
  setVh();
  window.addEventListener('resize', () => {
    setVh();
  });
  // End "Override vh property, so it works properly on mobile devices with browser navigation menus"

  // These settings are not user-configurable
  const cellWidth = 45;
  const mapWidth = 50;
  const minRoomWidth = 3;
  const maxRoomWidth = 8;
  const numberOfCritters = 5;
  const baseSpotLightRadius = cellWidth * 6;
  let spotLightRadius = cellWidth * 6;
  const playerBaseRunningFps = 7 / 20;
  const playerBaseLookingAroundFps = 5 / 250;
  const critterBaseRunningFps = 4 / 20;
  const critterBaseLookingAroundFps = 6 / 50;
  const ghostBaseRunningFps = 6 / 20;
  const ghostBaseSpawnDuration = 3000;
  const ghostBaseSpawningFps = 13 / 130;
  // End "These settings are not user-configurable"

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Enter') {
      return; // Do nothing if the event was already processed.
    }

    if (finishedLoading() &&  !isGameOver()) {
      startGame();
    } else if (isGameOver()) {
      if (document.activeElement?.id !== 'current-player-hs-name-input') {
        restartGame();
      }
    }

    event.preventDefault();
  }, true);

  // TODO: might want to refactor and not use playerSpeed.px and cellWidth both.
  //  Just pick one of them, since they must always be equal.
  const basePlayerSpeed: Speed = {ms: 300, px: cellWidth};
  const playerSpeed = {...basePlayerSpeed};
  const critterSpeed: Speed = {ms: 250, px: cellWidth};
  const ghostSpeed = {ms: 120, px: cellWidth};

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

  let player: Character;
  let playerSprite: AnimatedSprite;
  let playerTextures: PlayerTextureMap;
  const playerCoordObservers: Graphics[] = [];


  const critters: Character[] = [];
  const critterSprites: { id: UUID, sprite: AnimatedSprite }[] = []; // TODO: replace with animated sprites
  const crittersEaten: Character['id'][] = [];
  let critterTextures: CritterTextureMap;
  let critterBehaviour: (critter: Character, playerInstance: Character) => void;

  const ghosts: { instance: Character, sprite: AnimatedSprite, msWaitUntilSpawn: number, speed: Speed }[] = [];
  let ghostTextures: GhostTextureMap;
  // const numberOfGhosts = 2;
  const numberOfGhosts = 0;
  const initialGhostMsWaitUntilSpawn = {base: 15000, jitter: 5000}; // TODO: increase these numbers.
  const subsequentGhostMsWaitUntilSpawn = {base: 6000, jitter: 1000}; // TODO: increase these numbers.
  let ghostBehaviour: (
    ghost: { instance: Character, sprite: AnimatedSprite, msWaitUntilSpawn: number, speed: Speed }, // TODO: replace with animated sprites
    player: { instance: Character, sprite: AnimatedSprite },
  ) => void;

  const playerBuffs: CharacterBuff[] = [];
  const [buffsJsx, setBuffsJsx] = createSignal(<BuffsDisplay buffs={[]}/>);
  const [numberOfCrittersEaten, setNumberOfCrittersEaten] = createSignal(0);

  let playTimeTracker: NodeJS.Timer;
  const [playTime, setPlayTime] = createSignal(0);

  const playerSSMB = getSSMB();
  const critterSSMB = getSSMB();
  const ghostSSMB = getSSMB();

  const [finishedLoading, setFinishedLoading] = createSignal(false);

  const lineOneContent = 'Eat all the fish.'.split('').reverse();
  const [lineOne, setLineOne] = createSignal('');
  const [finishedTypingLineOne, setFinishedTypingLineOne] = createSignal(false);

  const lineTwoContent = 'Don\'t linger.'.split('').reverse();
  const [lineTwo, setLineTwo] = createSignal('');
  const [finishedTypingLineTwo, setFinishedTypingLineTwo] = createSignal(false);

  const lineThreeContent = 'Visitors are not welcome.'.split('').reverse();
  const [lineThree, setLineThree] = createSignal('');
  const [finishedTypingLineThree, setFinishedTypingLineThree] = createSignal(false);

  const lineGameLostContent = 'YOU DIED.'.split('').reverse();
  const [lineGameLost, setLineGameLost] = createSignal('');
  const [finishedTypingLineGameLost, setFinishedTypingLineGameLost] = createSignal(false);

  const typeLine = async (
    content: string[],
    lineSetter: Setter<string>,
    finishedTypingSetter: Setter<boolean>,
    nextLineCallback?: () => void,
  ) => {
    if (content.length === 0) {
      finishedTypingSetter(true);
      if (nextLineCallback) {
        nextLineCallback();
      }
      return;
    }

    await delay(randomInt(35, 50));

    lineSetter(line => line + content.pop());

    await typeLine(content,
      lineSetter,
      finishedTypingSetter,
      nextLineCallback);
  };

  const [isGameStarted, setIsGameStarted] = createSignal(false);
  const [isGameLost, setIsGameLost] = createSignal(false);
  const [isGameWon, setIsGameWon] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);

  onMount(async () => {
    typeLine(
      lineOneContent,
      setLineOne,
      setFinishedTypingLineOne,
      () => {
        typeLine(
          lineTwoContent,
          setLineTwo,
          setFinishedTypingLineTwo,
          () => {
            typeLine(
              lineThreeContent,
              setLineThree,
              setFinishedTypingLineThree,
            );
          },
        );
      },
    );
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
    const randomPlayerStartingCoords = generateRandomCoordsInRandomRoom(generatedRooms);

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
    player = getCharacter(pathfinder(), randomPlayerStartingCoords, playerSSMB);

    setGridCells(generatedGrid.cells);

    const container = new Container();

    // Add textures:
    // TODO: sort out the caching issue;
    //  not sure if it's to do w/ files having the same names + it doesn't account for their path, or what.
    await Assets.init({manifest: '/assets/sprite-textures-manifest.json'});
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
    fogOfWar.drawRect(0, 0, mapWidth * cellWidth, mapWidth * cellWidth);
    fogOfWar.endFill();
    const filter = new AlphaFilter(0.75);
    fogOfWar.filters = [filter];

    const light = new Graphics();
    const light2 = new Graphics();
    const light3 = new Graphics();
    playerCoordObservers.push(light, light2, light3);

    const playerLookingAroundTextures = await Assets.loadBundle('player-looking-around');
    const playerRunningTextures = await Assets.loadBundle('player-running');
    playerTextures = getPlayerTextures(playerLookingAroundTextures, playerRunningTextures);
    playerSprite = new AnimatedSprite(playerTextures.lookingAround.south, true);
    playerSprite.animationSpeed = playerBaseLookingAroundFps;
    playerSprite.play();
    playerSprite.width = cellWidth;
    playerSprite.height = cellWidth;
    playerSprite.x = (player?.x || -1) * playerSpeed.px;
    playerSprite.y = (player?.y || -1) * playerSpeed.px;

    container.addChild(playerSprite);

    const dustTextures = await Assets.loadBundle('dust');
    const dustSprite = new AnimatedSprite([
      dustTextures['frame_00'],
      dustTextures['frame_01'],
      dustTextures['frame_02'],
      dustTextures['frame_03'],
      Texture.EMPTY,
    ], true);
    dustSprite.animationSpeed = 5 / 10;
    dustSprite.loop = false;
    dustSprite.width = cellWidth;
    dustSprite.height = cellWidth;
    dustSprite.x = (player?.x || -1) * playerSpeed.px;
    dustSprite.y = (player?.y || -1) * playerSpeed.px - playerSpeed.px * 0.15;
    dustSprite.gotoAndStop(4);
    dustSprite.alpha = 0.35;

    container.addChild(dustSprite);

    // zIndex apparently doesn't matter, so we must add these "below" the fog of way & light layers
    // Critter stuff
    const critterUIUpdater = (critterInstance: Character, ssmb: SimpleSequenceMessageBroker) => {
      if (!playerSprite || isGameOver()) {
        return;
      }

      const critterSprite = critterSprites.find(cs => cs.id === critterInstance.id);

      if (!critterSprite || critterSprite.sprite.destroyed) {
        return;
      }

      // if (critterInstance.isTriggered) {
      //   critterSprite.sprite.tint = 'red';
      // }

      if (!critterInstance.isAlive) {
        // critterSprite.sprite.tint = 'grey';
        critterSprite.sprite.alpha = 0;
        ssmb.removeSubscriber(critterInstance.id);
        return;
      }

      // Animate critter sprite
      const ms = critterInstance.movementState;
      const runningFpsDivider = critterInstance.movementState.speed.ms / critterSpeed.ms;
      const fps = ms.action === 'running' ?
        critterBaseRunningFps * runningFpsDivider :
        critterBaseLookingAroundFps; // has to be a multiple of the number of textures.

      critterSprite.sprite.y = critterInstance.y * critterSpeed.px + cellWidth/4;

      if (ms.action === 'running') {
        switch (ms.direction) {
        case MovementDirection.N:
        case MovementDirection.NW:
        case MovementDirection.W:
          critterSprite.sprite.textures = critterTextures.running.north;
          critterSprite.sprite.scale.x = Math.abs(critterSprite.sprite.scale.x);
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth/4;
          break;
        case MovementDirection.NE:
        case MovementDirection.E:
          critterSprite.sprite.textures = critterTextures.running.north;
          critterSprite.sprite.scale.x = -1 * Math.abs(critterSprite.sprite.scale.x);
          // Translate the sprite right because the pixijs pivot makes no sense.
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth * 0.6;
          break;
        case MovementDirection.S:
        case MovementDirection.SW:
          critterSprite.sprite.textures = critterTextures.running.south;
          critterSprite.sprite.scale.x = Math.abs(critterSprite.sprite.scale.x);
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth/4;
          break;
        case MovementDirection.SE:
          critterSprite.sprite.textures = critterTextures.running.south;
          critterSprite.sprite.scale.x = -1 * Math.abs(critterSprite.sprite.scale.x);
          // Translate the sprite right because the pixijs pivot makes no sense.
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth * 0.6;
          break;
        }
      } else {
        switch (ms.direction) {
        case MovementDirection.N:
        case MovementDirection.NW:
        case MovementDirection.W:
        case MovementDirection.S:
        case MovementDirection.SW:
          critterSprite.sprite.textures = critterTextures.lookingAround;
          critterSprite.sprite.scale.set(Math.abs(critterSprite.sprite.scale.x), critterSprite.sprite.scale.y);
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth/4;
          break;
        case MovementDirection.NE:
        case MovementDirection.E:
        case MovementDirection.SE:
          critterSprite.sprite.textures = critterTextures.lookingAround;
          critterSprite.sprite.scale.set(-1 * Math.abs(critterSprite.sprite.scale.x), critterSprite.sprite.scale.y);
          // Translate the sprite right because the pixijs pivot makes no sense.
          critterSprite.sprite.x = critterInstance.x * critterSpeed.px + cellWidth * 0.6;
          break;
        }
      }

      critterSprite.sprite.animationSpeed = fps;
      critterSprite.sprite.play();

      // TODO: extract this whole method
      // Update critter visibility
      const distanceToPlayer = calcDiagonalDistance(
        {x: critterSprite.sprite.x, y: critterSprite.sprite.y},
        {x: playerSprite.x, y: playerSprite.y},
      );

      if (distanceToPlayer >= spotLightRadius) {
        critterSprite.sprite.alpha = 0;
        critterInstance.setIsTriggered(false);
        // critterSprite.sprite.tint = new Color('rgb(255,142,155)'); // TODO: clean up.
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
      if (distanceToPlayer < spotLightRadius * 0.5) {
        // critterSprite.sprite.tint = 'blue';

        if (
          // player.movementState.action === 'lookingAround'
          critterInstance.movementState.action === 'running'
          && critterInstance.willMeet(player)
          // && !critterInstance.isTriggered
        ) {
          // Stop critter from moving in the initial direction.
          critterInstance.stopMoving();
        }
      }
      if (distanceToPlayer < spotLightRadius * 0.1) {
        // critterSprite.sprite.tint = 'blue';
        if (!crittersEaten.includes(critterInstance.id)) {
          critterInstance.setIsAlive(false);
          crittersEaten.push(critterInstance.id);

          setNumberOfCrittersEaten(n => n + 1);
          setIsGameWon(numberOfCrittersEaten() === numberOfCritters);
          setIsGameOver(isGameWon());

          const blobFishBuffIndex = playerBuffs.findIndex(buff => buff.name === BuffName.BLOBFISH);
          if (blobFishBuffIndex < 0) {
            playerBuffs.push(getBlobfishBuff());
          } else {
            playerBuffs[blobFishBuffIndex].stacks++;
          }

          let speedBoost = 0;
          let sightBoost = 1;
          for (const buff of playerBuffs) {
            speedBoost += (buff.traits.speed || 0) * buff.stacks;
            sightBoost += (buff.traits.sight || 0) * buff.stacks;
          }

          playerSpeed.ms = basePlayerSpeed.ms - speedBoost;
          player.movementState.speed = playerSpeed;

          light.scale.set(sightBoost, sightBoost);
          light2.scale.set(sightBoost, sightBoost);
          light3.scale.set(sightBoost, sightBoost);
          spotLightRadius = baseSpotLightRadius * sightBoost;

          setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));

          critterSprite.sprite.destroy();
        }
      }
    };

    const playerUpdaterForCritters = (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive || isGameOver()) {
        return;
      }

      for (let i = 0; i < critters.length; i++) { // TODO: simply find the critterSprites directly (that are not destroyed)?
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
          // critterSprite.sprite.tint = new Color('rgb(255,142,155)');
          critterInstance.setIsTriggered(false);

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
        if (distanceToPlayer < spotLightRadius * 0.5) {
          // critterSprite.sprite.tint = 'blue';

          if (
            critterInstance.movementState.action === 'running'
            && !critterInstance.isTriggered
          ) {
            critterInstance.stopMoving();
          }

          if (
            critterInstance.movementState.action === 'lookingAround'
          ) {
            // Prevent critter from freaking out too often and trying to get random escape points all the time.
            critterInstance.setIsTriggered(true);
            //Stop critter from moving in the initial direction.
            critterInstance.isChangingDirection = true;
            critterInstance.moveAwayFrom(
              {x: playerInstance.x, y: playerInstance.y},
              {ms: critterSpeed.ms * 0.75, px: critterSpeed.px},
            );
          }
        }
        if (distanceToPlayer < spotLightRadius * 0.1) {
          console.log((critterInstance.isTriggered));
          // critterSprite.sprite.tint = 'blue';
          if (!crittersEaten.includes(critterInstance.id)) {
            critterInstance.setIsAlive(false);
            crittersEaten.push(critterInstance.id);

            // Could also be "setNumberOfCrittersEaten(n => ++n);"
            // or "setNumberOfCrittersEaten(crittersEaten.length);" but not
            // setNumberOfCrittersEaten(n => n++); - b/c n++ returns before it adds? Spent 30 min debugging that 💩.
            setNumberOfCrittersEaten(n => n + 1);
            setIsGameWon(numberOfCrittersEaten() === numberOfCritters);
            setIsGameOver(isGameWon());

            const blobFishBuffIndex = playerBuffs.findIndex(buff => buff.name === BuffName.BLOBFISH);
            if (blobFishBuffIndex < 0) {
              playerBuffs.push(getBlobfishBuff());
            } else {
              playerBuffs[blobFishBuffIndex].stacks++;
            }

            let speedBoost = 0;
            let sightBoost = 1;
            for (const buff of playerBuffs) {
              speedBoost += (buff.traits.speed || 0) * buff.stacks;
              sightBoost += (buff.traits.sight || 0) * buff.stacks;
            }

            playerSpeed.ms = basePlayerSpeed.ms - speedBoost;
            player.movementState.speed = playerSpeed;

            light.scale.set(sightBoost, sightBoost);
            light2.scale.set(sightBoost, sightBoost);
            light3.scale.set(sightBoost, sightBoost);
            spotLightRadius = baseSpotLightRadius * sightBoost;

            setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));

            critterSprite.sprite.destroy();
          }
        }
      }
    };

    // Generate critters
    const critterLookingAroundTextures = await Assets.loadBundle('blobfish-looking-around');
    const critterRunningTextures = await Assets.loadBundle('blobfish-running');
    critterTextures = getCritterTextures(
      critterLookingAroundTextures,
      critterRunningTextures,
    );

    for (let i = 0; i < numberOfCritters; i++) {
      const randomCritterStartingCoords = generateRandomCoordsInRandomRoom(generatedRooms, {x: player.x, y: player.y});
      const critterPathFinder = getPathfinder(generatedGrid, {allowDiagonalMovement: false});
      const critter = getCharacter(
        critterPathFinder,
        randomCritterStartingCoords,
        critterSSMB,
      );

      critters.push(critter);

      const critterSprite = new AnimatedSprite(critterTextures.lookingAround, true);
      critterSprite.animationSpeed = critterBaseLookingAroundFps;
      critterSprite.play();
      critterSprite.width = cellWidth/2;
      critterSprite.height = cellWidth/2;
      critterSprite.x = (critter.x || -1) * critterSpeed.px + cellWidth/4;
      critterSprite.y = (critter.y || -1) * critterSpeed.px + cellWidth/4;
      critterSprite.alpha = 0;

      container.addChild(critterSprite);

      critterSprites.push({id: critter.id, sprite: critterSprite});

      critterSSMB
        .addSubscriber({subscriptionId: critter.id, callback: critterUIUpdater});
    }

    critterBehaviour = async (critter: Character, playerInstance: Character) => {
      if (!critter.isAlive || isGameOver()) {
        return;
      }

      if (critter.movementState.action === 'lookingAround') {
        const randomLocation = generateRandomCoordsInRandomRoom(
          generatedRooms,
          {x: playerInstance.x, y: playerInstance.y},
        );

        if (!critter.willMeet(playerInstance)) {
          const speed = {...critterSpeed};

          if (critter.isTriggered) {
            speed.ms *= 0.5;
            await critter.moveTo(
              generatedGrid.getCellAt(randomLocation.x, randomLocation.y),
              speed,
              critter.pathfinder.getGridCellAt(playerInstance.x, playerInstance.y),
            );
          } else {
            await critter.moveTo(
              generatedGrid.getCellAt(randomLocation.x, randomLocation.y),
              speed,
            );
          }

          // Once destination was reached, wait 1 second plus a jitter before moving again.
          await delay(randomInt(2500, 4000));
        } else {
          await delay(randomInt(150, 350));
        }
      } else {
        await delay(randomInt(400, 600));
      }

      await critterBehaviour(critter, playerInstance);
    };
    // End "Critter stuff"

    // Ghosts stuff
    const ghostUiUpdater = (ghost: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (isGameOver()) {
        return;
      }

      const ghostInstance = ghosts.find(g => g.instance.id === ghost.id);

      if (!ghostInstance) {
        return;
      }

      const ghostSprite = ghostInstance.sprite;
      const ms = ghostInstance.instance.movementState;

      // Animate the ghost sprite
      ghostSprite.y = ghost.y * ghostSpeed.px;

      switch (ms.direction) {
      case MovementDirection.SW:
      case MovementDirection.W:
      case MovementDirection.NW:
      case MovementDirection.N:
        ghostSprite.scale.x = -1 * Math.abs(ghostSprite.scale.x);
        // Translate the ghost sprite right because pixijs pivots make no sense:
        ghostSprite.x = ghost.x * ghostSpeed.px + ghostSprite.width;
        break;
      case MovementDirection.NE:
      case MovementDirection.E:
      case MovementDirection.SE:
      case MovementDirection.S:
      default:
        ghostSprite.scale.x = Math.abs(ghostSprite.scale.x);
        ghostSprite.x = ghost.x * ghostSpeed.px;
      }

      const distanceToPlayer = calcDiagonalDistance(
        {x: ghostSprite.x, y: ghostSprite.y},
        {x: playerSprite.x, y: playerSprite.y},
      );

      if (distanceToPlayer >= spotLightRadius) {
        ghostSprite.alpha = 0;
      }
      if (distanceToPlayer < spotLightRadius) {
        ghostSprite.alpha = 0.35;
      }
      if (distanceToPlayer < spotLightRadius * 0.7) {
        ghostSprite.alpha = 1;
      }
      if (distanceToPlayer < spotLightRadius * 0.1 && ghostInstance.instance.isAlive) {
        console.log('Player caught.');
        player.setIsAlive(false);
        setIsGameLost(true);
        typeLine(
          lineGameLostContent,
          setLineGameLost,
          setFinishedTypingLineGameLost,
        );
        setIsGameOver(isGameLost());
      }
    };

    const playerUpdaterForGhosts = async (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive || isGameOver()) {
        return;
      }

      for (const ghost of ghosts) {
        const ghostSprite = ghost.sprite;

        const distanceToPlayer = calcDiagonalDistance(
          {x: ghostSprite.x, y: ghostSprite.y},
          {x: playerInstance.x * cellWidth, y: playerInstance.y * cellWidth},
        );

        if (distanceToPlayer >= spotLightRadius) {
          ghostSprite.alpha = 0;
        }
        if (distanceToPlayer < spotLightRadius) {
          ghostSprite.alpha = 0.35;
        }
        if (distanceToPlayer < spotLightRadius * 0.7) {
          ghostSprite.alpha = 1;
        }
        if (distanceToPlayer < spotLightRadius * 0.1 && ghost.instance.isAlive) {
          console.log('Player caught.');
          player.setIsAlive(false);
          setIsGameLost(true);
          typeLine(
            lineGameLostContent,
            setLineGameLost,
            setFinishedTypingLineGameLost,
          );
          setIsGameOver(isGameLost());
        }
      }
    };

    // Generate ghosts
    const ghostLookingAroundTextures = await Assets.loadBundle('ghost-looking-around');
    const ghostRunningTextures = await Assets.loadBundle('ghost-running');
    ghostTextures = getGhostTextures(
      ghostLookingAroundTextures,
      ghostRunningTextures,
    );

    for (let i = 0; i < numberOfGhosts; i++) {
      const ghostPathfinder = getPathfinder(generatedGrid);
      const ghost = getCharacter(ghostPathfinder, {x: -1, y: -1}, ghostSSMB);

      const ghostSprite = new AnimatedSprite(ghostTextures.spawn, true);
      ghostSprite.animationSpeed = ghostBaseSpawningFps;
      ghostSprite.loop = false;
      ghostSprite.width = cellWidth;
      ghostSprite.height = cellWidth;

      if (i % 2 === 1) {
        ghostSprite.tint = 'rgb(191, 223, 159)';
      }

      ghosts.push({
        instance: ghost,
        sprite: ghostSprite,
        msWaitUntilSpawn: initialGhostMsWaitUntilSpawn.base + i * initialGhostMsWaitUntilSpawn.jitter,
        speed: ghostSpeed,
      });

      container.addChild(ghostSprite); // TODO: replace with animated ghost sprite.

      ghostSSMB.addSubscriber({subscriptionId: ghost.id, callback: ghostUiUpdater});
    }

    ghostBehaviour = async (
      ghost: { instance: Character, msWaitUntilSpawn: number, sprite: AnimatedSprite, speed: Speed },
      player: { instance: Character, sprite: AnimatedSprite },
    ) => {
      if (isGameOver()) {
        return;
      }

      const ghostInstance = ghost.instance;
      const ghostSpawnWait = ghost.msWaitUntilSpawn;
      const ghostSprite = ghost.sprite;

      ghostInstance.setIsAlive(false); // we'll use this as: ghost is deadly if it's alive, otherwise it won't harm the player.

      const playerInstance = player.instance;
      const playerSprite = player.sprite;

      await delay(ghostSpawnWait);

      let randomGhostSpawningCoords;
      const playerCell = ghostInstance.pathfinder.getGridCellAt(playerInstance.x, playerInstance.y);
      const playerRoom = generatedRooms.find(room => room.roomDto.id === playerCell.roomId);

      if (playerRoom) {
        randomGhostSpawningCoords = generateRandomCoordsInSpecificRoom(
          playerRoom,
          {x: playerInstance.x, y: playerInstance.y},
        );
      } else { // TODO: should just add a 'type' to the Room/Corridor, to make this easy.
        randomGhostSpawningCoords = ghostInstance.pathfinder.generateObstacleAwareRandomCoordsInAreaAround(
          {x: playerInstance.x, y: playerInstance.y}, 5, true,
        );
      }

      if (!randomGhostSpawningCoords) { // continue
        ghostBehaviour(ghost, player);
        return;
      }

      ghostInstance.x = randomGhostSpawningCoords.x;
      ghostInstance.y = randomGhostSpawningCoords.y;

      ghostSprite.scale.x = Math.abs(ghostSprite.scale.x);
      ghostSprite.x = ghostInstance.x * ghostSpeed.px;
      ghostSprite.y = ghostInstance.y * ghostSpeed.px;

      // TODO:
      //  1. extract this whole distance/alpha thing as its own thing.
      //  2. refactor the other places that could use the sprite directly, rather than having to recalculate its position.
      const distanceToPlayer = calcDiagonalDistance(
        {x: ghostSprite.x, y: ghostSprite.y},
        {x: playerSprite.x, y: playerSprite.y},
      );

      if (distanceToPlayer >= spotLightRadius) {
        ghostSprite.alpha = 0;
      }
      if (distanceToPlayer < spotLightRadius) {
        ghostSprite.alpha = 0.35;
      }
      if (distanceToPlayer < spotLightRadius * 0.7) {
        ghostSprite.alpha = 1;
      }

      // Play ghost spawn animation.
      ghostSprite.textures = ghostTextures.spawn;
      ghostSprite.gotoAndPlay(0);
      ghostSprite.onComplete = () => {
        // When animation completes, ghost is able to kill the player.
        ghostInstance.setIsAlive(true);
      };
      await delay(ghostBaseSpawnDuration + randomInt(0, 1000));

      // Try to anticipate the player's movement
      const ghostTargetCoords: Coords = {
        x: playerInstance.x + (playerInstance.movementState.action === 'running' ?
          playerInstance.movementState.vectorX * randomInt(1, 3) :
          0),
        y: playerInstance.y + (playerInstance.movementState.action === 'running' ?
          playerInstance.movementState.vectorY * randomInt(1, 3) :
          0),
      };

      const ghostTargetCell = ghostInstance.pathfinder.getGridCellAt(ghostTargetCoords.x, ghostTargetCoords.y);

      ghostSprite.textures = ghostTextures.running;
      ghostSprite.animationSpeed = ghostBaseRunningFps;
      ghostSprite.gotoAndPlay(0);
      await ghostInstance.moveTo(ghostTargetCell, ghostSpeed);

      // Play ghost de-spawn animation.
      await delay(300 + randomInt(50, 200));
      ghostSprite.textures = ghostTextures.despawn;
      ghostSprite.gotoAndPlay(0);
      ghostInstance.setIsAlive(false); // Ghost will not kill the player anymore.

      const newGhostSpawnWait = randomInt(
        subsequentGhostMsWaitUntilSpawn.base,
        subsequentGhostMsWaitUntilSpawn.base + subsequentGhostMsWaitUntilSpawn.jitter,
      );

      subsequentGhostMsWaitUntilSpawn.base = Math.max(subsequentGhostMsWaitUntilSpawn.base - 300, 1500);
      subsequentGhostMsWaitUntilSpawn.jitter - Math.floor(subsequentGhostMsWaitUntilSpawn.jitter * 0.9);

      // TODO: make the ghost slightly faster - probably add a speed param to this function and remove the "base" ghost speed.
      ghost.speed.ms = Math.floor(ghost.speed.ms * 0.9);

      await ghostBehaviour(
        {
          instance: ghostInstance,
          msWaitUntilSpawn: newGhostSpawnWait,
          sprite: ghostSprite,
          speed: ghost.speed,
        },
        player,
      );
    };
    // End "Ghosts stuff"

    // Add can of milk
    const buffTextures = await Assets.loadBundle('buffs');
    const randomMilkCanCoords = generateRandomCoordsInRandomRoom(generatedRooms, {x: player.x, y: player.y});
    const canOfMilkSprite = new Sprite(buffTextures['milk']);
    canOfMilkSprite.width = cellWidth / 2;
    canOfMilkSprite.height = cellWidth / 2;
    canOfMilkSprite.x = randomMilkCanCoords.x * cellWidth + cellWidth / 4;
    canOfMilkSprite.y = randomMilkCanCoords.y * cellWidth + cellWidth / 4;
    canOfMilkSprite.alpha = 0;

    container.addChild(canOfMilkSprite);
    // End "Add can of milk"

    light.beginFill();
    light.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, baseSpotLightRadius);
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
    light2.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, baseSpotLightRadius);
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
    light3.drawCircle(playerSprite.x + cellWidth / 2, playerSprite.y + cellWidth / 2, baseSpotLightRadius);
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

    const playerUIUpdater = (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerSprite || !playerInstance.isAlive || isGameOver()) {
        return;
      }

      // Animate player sprite
      const ms = playerInstance.movementState;
      const runningFpsDivider = playerBaseRunningFps / (1 + numberOfCrittersEaten() / 30);
      const fps = ms.action === 'running' ? runningFpsDivider : playerBaseLookingAroundFps; // has to be a multiple of the number of textures.
      playerSprite.textures = playerTextures[ms.action][ms.direction];
      playerSprite.animationSpeed = fps;
      playerSprite.play();
      playerSprite.x = player.x * playerSpeed.px;
      playerSprite.y = player.y * playerSpeed.px;

      dustSprite.x = player.x * playerSpeed.px;
      dustSprite.y = player.y * playerSpeed.px - playerSpeed.px * 0.15;
      if (ms.action === 'running' && playerSpeed.ms <= 150) {
        dustSprite.gotoAndPlay(0);
      }

      // Animate player visibility area/lights
      playerCoordObservers.forEach(co => {
        co.x += ms.vectorX * playerSpeed.px;
        co.y += ms.vectorY * playerSpeed.px;
      });

      // Check if the player character reached an upgrade/buff.
      // TODO: this could be its own callback but given there's only one buff at the moment, that's not necessary yet.
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
          playerBuffs.push(getMilkCanBuff());

          let speedBoost = 0;
          for (const buff of playerBuffs) {
            speedBoost += (buff.traits.speed || 0) * buff.stacks;
          }

          playerSpeed.ms = basePlayerSpeed.ms - speedBoost;
          player.movementState.speed = playerSpeed;

          setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));

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
      .addSubscriber({subscriptionId: player.id, callback: playerUpdaterForCritters})
      .addSubscriber({subscriptionId: player.id, callback: playerUpdaterForGhosts});

    setFinishedLoading(true);
    // TODO: the below used for dev, remove
    // setIsGameStarted(true);
    // setIsGameOver(true);
    // setIsGameWon(true);
  });

  const destroyPixiApp = () => {
    console.debug('Destroying app…');
    setIsGameOver(true);
    pixiApp().stage.destroy({children: true, texture: true, baseTexture: true}); // Should not be needed but…
    pixiApp().destroy(true, {children: true, texture: true, baseTexture: true});
  };

  onCleanup(() => {
    setIsGameOver(true);
    destroyPixiApp();
  });

  const startGame = () => {
    if (!finishedLoading()) {
      return;
    }

    for (const critter of critters) {
      critterBehaviour(critter, player);
    }

    for (const ghost of ghosts) {
      ghostBehaviour(ghost, { instance: player, sprite: playerSprite });
    }

    setIsGameStarted(true);
    playTimeTracker = setInterval(() => {
      if (numberOfCrittersEaten() !== numberOfCritters && player.isAlive) {
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

  const restartGame = () => {
    location.reload();
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

  createEffect(() => {
    if (isGameOver()) {
      console.debug('Game over.');
      destroyPixiApp();
    }
  });

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
        <div id="grid-scrollable-container"
          class={`inline-block w-screen ${styles.heightScreen}`}
          classList={{
            'overflow-auto': isGameStarted(),
            'overflow-visible': !isGameStarted() || isGameOver(),
          }}
        >
          {
            isGameWon() &&
            <div class={'bg-slate-800 h-full w-full grid grid-cols-1 content-center z-30'}>
              <GameWon playerTimeToComplete={playTime()} restartGameCallback={restartGame}/>
              {/*<GameWon playerTimeToComplete={randomInt(30, 300)} restartGameCallback={restartGame}/>*/}
            </div>
          }
          {
            isGameLost() &&
            <div class={'bg-slate-800 h-full w-full ' +
              'grid grid-cols-1 content-center z-30 '}>
              <div class={'w-4/5 sm:w-3/4 lg:w-1/2 text-left m-auto'}>
                <div class={'grid grid-cols-1 sm:grid-cols-7 gap-y-5'}>
                  <div class={'col-span-5'}>
                    <h1>
                      {lineGameLost()}
                      <span classList={{
                        'animate-pulse-fast': finishedTypingLineGameLost(),
                      }}>_</span>
                    </h1>
                  </div>
                  <div class={'transition-opacity col-span-2 justify-self-center sm:justify-self-end mt-0 sm:-mt-6'}
                    classList={{
                      'opacity-0': !finishedTypingLineGameLost(),
                      'opacity-100': finishedTypingLineGameLost(),
                    }}>
                    <EnterButton onClick={() => restartGame()}
                      isDisabled={!(isGameLost() && finishedTypingLineGameLost())} />
                  </div>
                </div>
              </div>
            </div>
          }
          {
            (!finishedLoading() || !isGameStarted()) &&
            <div class={'bg-slate-800 h-full w-full ' +
                   'grid grid-cols-1 content-center z-30 '}>
              <div class={'w-4/5 sm:w-3/4 lg:w-1/2 text-left m-auto gap-y-5'}>
                <h1>
                  <span style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    {lineOne()}
                  </span>
                  {
                    !finishedTypingLineOne() && <span>_</span>
                  }
                </h1>
                <h1>
                  <span style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    {lineTwo()}
                  </span>
                  { finishedTypingLineOne() && !finishedTypingLineTwo() &&
                    <span>_</span>
                  }
                </h1>
                <div class={'grid grid-cols-1 sm:grid-cols-7 gap-y-5'}>
                  <div class={'col-span-5'}>
                    <h1>
                      {lineThree()}
                      { finishedTypingLineThree() &&
                        <span classList={{
                          'animate-pulse-fast': finishedTypingLineThree(),
                        }}>_</span>
                      }
                    </h1>
                  </div>
                  <div class={'transition-opacity col-span-2 justify-self-center sm:justify-self-end mt-0 sm:-mt-6'}
                    classList={{
                      'opacity-0': !finishedTypingLineThree(),
                      'opacity-100': finishedTypingLineThree(),
                    }}>
                    <EnterButton onClick={() => startGame()}
                      isDisabled={!(finishedLoading() && finishedTypingLineThree())} />
                  </div>
                </div>
              </div>
            </div>
          }
          {
            finishedLoading() && isGameStarted() && !isGameOver() &&
            <>
              <div class={'absolute top-5 left-[3%] text-left z-20 ' +
                'p-3 bg-slate-700/50 border-2 border-slate-900 ' +
                'outline-double outline-2 outline-offset-2 outline-slate-700 '}>
                <div>
                  <p class={'text-lg sm:text-2xl md:text-3xl leading-normal text-white'}
                    style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    Time played: {formatSeconds(playTime())}
                  </p>
                </div>
                <div class={'flex flex-wrap gap-x-3 gap-y-4 items-center max-w-[330px] sm:max-w-sm md:max-w-md'}>
                  <p class={'text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-white'}
                    style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    Fish left: {numberOfCritters - numberOfCrittersEaten()}
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
