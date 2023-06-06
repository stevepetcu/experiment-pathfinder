import {ColorGradientFilter} from '@pixi/filter-color-gradient';
import {UUID} from 'crypto';
import {
  AlphaFilter,
  AnimatedSprite,
  Application,
  Assets,
  BLEND_MODES,
  Color,
  Container,
  Graphics,
  MSAA_QUALITY,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import {createSignal, JSXElement, onCleanup, onMount, Show} from 'solid-js';

import charTextures from '../assets/CharTextures';
import {Character, DEFAULT_SPEED, getCharacter, Speed} from '../models/Character';
import {BuffName, CharacterBuff, getBlobfishBuff, getMilkCanBuff} from '../models/CharacterBuff';
import {
  generateCorridors,
  generateRandomCoordsInRandomRoom,
  generateRandomCoordsInSpecificRoom,
  generateRooms,
} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import delay from '../utils/Delay';
import {calcDiagonalDistance} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import getSSMB, {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {formatSeconds} from '../utils/Time';
import BuffsDisplay from './BuffsDisplay';

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

export default function GridMapSquarePixi(): JSXElement {
  // These settings are not user-configurable
  const cellWidth = 45;
  const mapWidth = 50;
  const minRoomWidth = 3;
  const maxRoomWidth = 8;
  const numberOfCritters = 5;
  const baseSpotLightRadius = cellWidth * 6; // TODO: make this smaller on mobile?
  let spotLightRadius = cellWidth * 6; // TODO: make this smaller on mobile?
  const baseRunningFps = 7 / 20;
  const baseLookingAroundFps = 5 / 250;
  // End "These settings are not user-configurable"

  // TODO: might want to refactor and not use playerSpeed.px and cellWidth both.
  //  Just pick one of them, since they must always be equal.
  const basePlayerSpeed: Speed = {...DEFAULT_SPEED, px: cellWidth};
  const playerSpeed = {...basePlayerSpeed};

  const critterSpeed: Speed = {ms: 245, px: cellWidth};

  const baseGhostSpeed = {ms: 150, px: cellWidth};
  const ghostSpeed = {...baseGhostSpeed};

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
  let characterTextures: CharacterTextureMap;
  const playerCoordObservers: Graphics[] = [];

  const critters: Character[] = [];
  const critterSprites: { id: UUID, sprite: Sprite }[] = [];
  const crittersEaten: Character['id'][] = [];
  let critterBehaviour: (critter: Character, playerInstance: Character) => void;
  let ghostBehaviour: (ghost: Character, playerInstance: Character, ghostSpawnTimeInMs: number) => void;

  let ghost: Character;
  const initialGhostSpawnTime = 3000; // TODO: set to 15000 or 20000 initially
  // let ghostSprite: AnimatedSprite;
  const ghostTexture = Texture.WHITE;
  const ghostSprite = new Sprite(ghostTexture);
  ghostSprite.width = cellWidth / 2;
  ghostSprite.height = cellWidth / 2;
  ghostSprite.tint = 'green';

  const playerBuffs: CharacterBuff[] = [];
  // const [pb, setPb] = createSignal<CharacterBuff[]>([]); // TODO figure out why this doesn't update.
  const [buffsJsx, setBuffsJsx] = createSignal(<BuffsDisplay buffs={[]}/>);
  const [numberOfCrittersEaten, setNumberOfCrittersEaten] = createSignal(0);

  let playTimeTracker: NodeJS.Timer;
  const [playTime, setPlayTime] = createSignal(0);

  const playerSSMB = getSSMB();
  const critterSSMB = getSSMB();
  const ghostSSMB = getSSMB();

  const [finishedLoading, setFinishedLoading] = createSignal(false);
  const [loadingProgress, setLoadingProgress] = createSignal(0);
  const [isGameStarted, setIsGameStarted] = createSignal(false);

  onMount(async () => {
    const smokeAndMirrorsLoading = async () => {
      const randomWaitTime = randomInt(50, 331);
      const randomProgress = randomInt(1, 4);
      await delay(randomWaitTime);
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
    fogOfWar.drawRect(0, 0, mapWidth * cellWidth, mapWidth * cellWidth);
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
    playerSprite.animationSpeed = baseLookingAroundFps; // TODO: extract this as a constant.
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

    const critterUIUpdater = (critterInstance: Character, ssmb: SimpleSequenceMessageBroker) => {
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
        if (!crittersEaten.includes(critterInstance.id)) {
          critterInstance.setIsAlive(false);
          crittersEaten.push(critterInstance.id);
          setNumberOfCrittersEaten(n => n + 1);

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
          light.scale.set(sightBoost, sightBoost);
          light2.scale.set(sightBoost, sightBoost);
          light3.scale.set(sightBoost, sightBoost);
          spotLightRadius = baseSpotLightRadius * sightBoost;

          setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));
          // setPb(playerBuffs);

          critterSprite.sprite.destroy();
        }
      }
    };

    const playerUpdaterForCritters = (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
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
            light.scale.set(sightBoost, sightBoost);
            light2.scale.set(sightBoost, sightBoost);
            light3.scale.set(sightBoost, sightBoost);
            spotLightRadius = baseSpotLightRadius * sightBoost;

            setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));
            // setPb(playerBuffs);

            critterSprite.sprite.destroy();
          }
        }
      }
    };

    // Generate critters
    // zIndex apparently doesn't matter, so we must add these "below" the fog of way & light layers
    critterBehaviour = async (critter: Character, playerInstance: Character) => {
      if (!critter.isAlive) {
        return;
      }

      const randomLocation = generateRandomCoordsInRandomRoom(
        generatedRooms,
        {x: playerInstance.x, y: playerInstance.y},
      );

      await critter.moveTo(generatedGrid.getCellAt(randomLocation.x, randomLocation.y), critterSpeed);

      // Wait 2 seconds after reaching the destination.
      await delay(2000);
      await critterBehaviour(critter, playerInstance);
    };

    for (let i = 0; i < numberOfCritters; i++) {
      const randomCritterStartingCoords = generateRandomCoordsInRandomRoom(generatedRooms, {x: player.x, y: player.y});
      const critterPathFinder = getPathfinder(generatedGrid, {allowDiagonalMovement: false});
      const critter = getCharacter(
        critterPathFinder,
        randomCritterStartingCoords,
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

    // Ghosts stuff
    container.addChild(ghostSprite); // TODO: replace with animated ghost sprite.

    const ghostPathfinder = getPathfinder(generatedGrid);
    ghost = getCharacter(ghostPathfinder, {x: -1, y: -1}, ghostSSMB);
    const playerUpdaterForGhosts = async (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive) {
        return;
      }

      // TODO: If the player meets the ghost, do things.
      //  Make ghost invisible outside of the player's sight radius
    };

    ghostBehaviour = async (ghost: Character, playerInstance: Character, ghostSpawnTimeInMs: number) => {
      console.log(ghostSpawnTimeInMs);
      await delay(ghostSpawnTimeInMs);
      const playerCell = ghost.pathfinder.getGridCellAt(playerInstance.x, playerInstance.y);
      const playerRoom = generatedRooms.find(room => room.roomDto.id === playerCell.roomId);

      if (!playerRoom) {
        return; // Don't generate ghosts in corridors.
      }

      const randomGhostSpawningCoords = generateRandomCoordsInSpecificRoom(
        playerRoom,
        {x: playerInstance.x, y: playerInstance.y},
      );

      ghost.x = randomGhostSpawningCoords.x;
      ghost.y = randomGhostSpawningCoords.y;

      ghostSprite.x = ghost.x * ghostSpeed.px + cellWidth / 4;
      ghostSprite.y = ghost.y * ghostSpeed.px + cellWidth / 4;

      // TODO:
      //  Set a timeout before the ghost starts moving. The timeout should become smaller every 10 seconds.
      //  Set ghost move target and get it moving.
      //  Set a speed for the ghost (significantly higher than the player's speed)
      //  Make ghost invisible outside of the player's sight radius
      await ghostBehaviour(ghost, playerInstance, Math.max(ghostSpawnTimeInMs - 500, 1000));
    };

    const ghostUiUpdater = (ghost: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!ghost.isAlive) {
        return;
      }

      // TODO: update ghost sprite when the ghost moves.
      //  If the ghost meets the player, do things.
    };

    ghostSSMB.addSubscriber({subscriptionId: ghost.id, callback: ghostUiUpdater});

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
      if (!playerSprite || !playerInstance.isAlive) {
        return;
      }

      // Animate player sprite
      const ms = playerInstance.movementState;
      const runningFpsDivider = baseRunningFps / (1 + numberOfCrittersEaten() / 30);
      const fps = ms.action === 'running' ? runningFpsDivider : baseLookingAroundFps; // has to be a multiple of the number of textures.
      playerSprite.textures = characterTextures[ms.action][ms.direction];
      playerSprite.animationSpeed = fps;
      playerSprite.play();
      playerSprite.x = player.x * playerSpeed.px;
      playerSprite.y = player.y * playerSpeed.px;

      dustSprite.x = player.x * playerSpeed.px;
      dustSprite.y = player.y * playerSpeed.px - playerSpeed.px * 0.15;
      if (ms.action === 'running' && playerSpeed.ms <= 180) {
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

          setBuffsJsx(BuffsDisplay({buffs: playerBuffs}));
          // setPb(playerBuffs);

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
      critterBehaviour(critter, player);
    }

    ghostBehaviour(ghost, player, initialGhostSpawnTime);

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
          class={'inline-block w-screen h-screen'}
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
              <p class={'text-3xl sm:text-4xl md:text-6xl leading-none text-slate-400 antialiased'}
                style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                Eat all the fish.
              </p>
              <p class={'text-2xl sm:text-3xl md:text-4xl leading-none text-slate-400 antialiased'}
                style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                Don't linger. There are other hungry things besides you.
              </p>
              <p class={'text-2xl sm:text-3xl md:text-4xl leading-none text-white antialiased'}>
                {
                  !finishedLoading() && `Loading ${loadingProgress()}%`
                }
                {
                  finishedLoading() && 'Click anywhere to start'
                }
              </p>
            </div>
          }
          {
            finishedLoading() && isGameStarted() &&
            <>
              <div class={'absolute top-5 left-[3%] text-left z-20 ' +
                'p-3 slashed-zero rounded-lg ' +
                'bg-gradient-to-r from-slate-700/50 from-45% ' +
                'outline outline-offset-2 outline-slate-700'}>
                <div>
                  <p class={'text-lg sm:text-2xl md:text-3xl leading-normal text-white'}>
                    Time played: {formatSeconds(playTime())}
                  </p>
                </div>
                <div class={'flex flex-wrap gap-x-3 gap-y-4 items-center max-w-[330px] sm:max-w-sm md:max-w-md'}>
                  <p class={'text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-white'}>
                    Fish left: {numberOfCritters - numberOfCrittersEaten()}
                  </p>
                  {buffsJsx()}
                  {/*<BuffsDisplay buffs={pb()}/>*/}
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
