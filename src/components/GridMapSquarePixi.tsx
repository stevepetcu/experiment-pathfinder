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
import {Character, getCharacter, Speed} from '../models/Character';
import {BuffName, CharacterBuff, getBlobfishBuff, getMilkCanBuff} from '../models/CharacterBuff';
import {Coords} from '../models/Coords';
import {
  generateCorridors,
  generateRandomCoordsInRandomRoom, generateRandomCoordsInSpecificCorridor,
  generateRandomCoordsInSpecificRoom, generateRooms,
} from '../models/Map';
import {getEmptyPathfinder, getPathfinder, Pathfinder} from '../models/Pathfinder';
import {CellStatus, getEmptyGrid, getSquareGrid, GridCell} from '../models/SquareGrid';
import delay from '../utils/Delay';
import {calcDiagonalDistance} from '../utils/DistanceCalculator';
import randomInt from '../utils/RandomInt';
import getSSMB, {SimpleSequenceMessageBroker} from '../utils/SimpleSequenceMessageBroker';
import {formatSeconds} from '../utils/Time';
import BuffsDisplay from './BuffsDisplay';
import EnterButton from './EnterButton';

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
  let characterTextures: CharacterTextureMap;
  const playerCoordObservers: Graphics[] = [];

  const critters: Character[] = [];
  const critterSprites: { id: UUID, sprite: Sprite }[] = []; // TODO: replace with animated sprites
  const crittersEaten: Character['id'][] = [];
  let critterBehaviour: (critter: Character, playerInstance: Character) => void;

  const ghosts: { instance: Character, sprite: Sprite, msWaitUntilSpawn: number, speed: Speed }[] = [];
  const numberOfGhosts = 2;
  const initialGhostMsWaitUntilSpawn = {base: 5000, jitter: 5000}; // TODO: increase these numbers.
  const subsequentGhostMsWaitUntilSpawn = {base: 5000, jitter: 500}; // TODO: increase these numbers.
  let ghostBehaviour: (
    ghost: { instance: Character, sprite: Sprite, msWaitUntilSpawn: number, speed: Speed }, // TODO: replace with animated sprites
    player: { instance: Character, sprite: Sprite },
    critters: Character[]
  ) => void;

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

  const lineOneContent = 'Eat all the fish.'.split('').reverse();
  const [lineOne, setLineOne] = createSignal('');
  const [finishedTypingLineOne, setFinishedTypingLineOne] = createSignal(false);

  const lineTwoContent = 'Don\'t linger. There are other hungry things besides you.'.split('').reverse();
  const [lineTwo, setLineTwo] = createSignal('');
  const [finishedTypingLineTwo, setFinishedTypingLineTwo] = createSignal(false);


  const typeLineTwo = async (content: string[]) => {
    if (content.length === 0) {
      setFinishedTypingLineTwo(true);
      return;
    }

    await delay(randomInt(25, 50));

    setLineTwo(line => line + content.pop());

    await typeLineTwo(content);
  };
  const typeLineOne = async (content: string[]) => {
    if (content.length === 0) {
      setFinishedTypingLineOne(true);
      typeLineTwo(lineTwoContent);
      return;
    }

    await delay(randomInt(25, 50));

    setLineOne(line => line + content.pop());

    await typeLineOne(content);
  };

  const [isGameStarted, setIsGameStarted] = createSignal(false);

  onMount(async () => {
    typeLineOne(lineOneContent);
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

    // zIndex apparently doesn't matter, so we must add these "below" the fog of way & light layers
    // Critter stuff
    const critterUIUpdater = (critterInstance: Character, ssmb: SimpleSequenceMessageBroker) => {
      if (!playerSprite) {
        return;
      }

      const critterSprite = critterSprites.find(cs => cs.id === critterInstance.id);

      if (!critterSprite || critterSprite.sprite.destroyed) {
        return;
      }

      if (critterInstance.isTriggered) {
        critterSprite.sprite.tint = 'red';
      }

      if (!critterInstance.isAlive) {
        // critterSprite.sprite.tint = 'grey';
        critterSprite.sprite.alpha = 0;
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
        critterInstance.setIsTriggered(false);
        critterSprite.sprite.tint = new Color('rgb(255,142,155)'); // TODO: clean up.
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
        critterSprite.sprite.tint = 'blue';  // TODO: use the frowning fish texture?

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
          // setPb(playerBuffs);

          critterSprite.sprite.destroy();
        }
      }
    };

    const playerUpdaterForCritters = (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive) {
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
          critterSprite.sprite.tint = new Color('rgb(255,142,155)');
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
          critterSprite.sprite.tint = 'blue'; // TODO: use the frowning fish texture?

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
            // setPb(playerBuffs);

            critterSprite.sprite.destroy();
          }
        }
      }
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

    critterBehaviour = async (critter: Character, playerInstance: Character) => {
      if (!critter.isAlive) {
        return;
      }

      if (critter.movementState.action === 'lookingAround') {
        const randomLocation = generateRandomCoordsInRandomRoom(
          generatedRooms,
          {x: playerInstance.x, y: playerInstance.y},
        );

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
        await delay(randomInt(500, 2000));
      } else {
        await delay(1500);
        await critterBehaviour(critter, playerInstance);
      }
    };
    // End "Critter stuff"

    // Ghosts stuff
    const ghostUiUpdater = (ghost: Character, _ssmb: SimpleSequenceMessageBroker) => {
      const ghostInstance = ghosts.find(g => g.instance.id === ghost.id);

      if (!ghostInstance) {
        return;
      }

      const ghostSprite = ghostInstance.sprite;

      // Animate ghost sprite
      ghostSprite.x = ghost.x * ghostSpeed.px + cellWidth / 4;
      ghostSprite.y = ghost.y * ghostSpeed.px + cellWidth / 4;

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
        console.log(`Ghost ${ghostInstance.instance.id} caught the player!`);
        // TODO: If the ghost meets the player, do things.
      }
    };

    const playerUpdaterForGhosts = async (playerInstance: Character, _ssmb: SimpleSequenceMessageBroker) => {
      if (!playerInstance.isAlive) {
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
          console.log(`Ghost ${ghost.instance.id} caught the player!`);
          // TODO: If the ghost meets the player, do things.
        }
      }

      // TODO: If the player meets the ghost, do things.
      //  Make ghost invisible outside of the player's sight radius
    };

    for (let i = 0; i < numberOfGhosts; i++) {
      const ghostPathfinder = getPathfinder(generatedGrid);
      const ghost = getCharacter(ghostPathfinder, {x: -1, y: -1}, ghostSSMB);

      const ghostTexture = Texture.WHITE;
      const sprite = new Sprite(ghostTexture);
      sprite.tint = i === 0 ? 'green' : 'purple';
      sprite.width = cellWidth / 2;
      sprite.height = cellWidth / 2;

      ghosts.push({
        instance: ghost,
        sprite,
        msWaitUntilSpawn: initialGhostMsWaitUntilSpawn.base + i * initialGhostMsWaitUntilSpawn.jitter,
        speed: ghostSpeed,
      });

      container.addChild(sprite); // TODO: replace with animated ghost sprite.

      ghostSSMB.addSubscriber({subscriptionId: ghost.id, callback: ghostUiUpdater});
    }

    ghostBehaviour = async (
      ghost: { instance: Character, msWaitUntilSpawn: number, sprite: Sprite, speed: Speed },
      player: { instance: Character, sprite: Sprite },
      critters,
    ) => {
      if (!critters.some(critter => critter.isAlive)) {
        return;
      }

      const ghostInstance = ghost.instance;
      const ghostSpawnWait = ghost.msWaitUntilSpawn;
      const ghostSprite = ghost.sprite;

      ghostInstance.setIsAlive(false); // we'll use this as: ghost is deadly if it's alive, otherwise it won't harm the player.

      const playerInstance = player.instance;
      const playerSprite = player.sprite;

      await delay(ghostSpawnWait);
      const playerCell = ghostInstance.pathfinder.getGridCellAt(playerInstance.x, playerInstance.y);

      let randomGhostSpawningCoords;
      let playerCorridor;
      const playerRoom = generatedRooms.find(room => room.roomDto.id === playerCell.roomId);

      if (playerRoom) {
        randomGhostSpawningCoords = generateRandomCoordsInSpecificRoom(
          playerRoom,
          {x: playerInstance.x, y: playerInstance.y},
        );
      } else { // TODO: should just add a 'type' to the Room/Corridor, to make this easy.
        playerCorridor = generatedCorridors.find(corridor => corridor.id === playerCell.roomId);
        if (!playerCorridor || playerCorridor.length() < 3) { // continue
          await ghostBehaviour(ghost, player, critters);
        }
        randomGhostSpawningCoords = generateRandomCoordsInSpecificCorridor(
          playerCorridor!, {x: playerInstance.x, y: playerInstance.y},
        );
      }

      ghostInstance.x = randomGhostSpawningCoords.x;
      ghostInstance.y = randomGhostSpawningCoords.y;

      ghostSprite.x = ghostInstance.x * ghostSpeed.px + cellWidth / 4;
      ghostSprite.y = ghostInstance.y * ghostSpeed.px + cellWidth / 4;

      // TODO:
      //  1. extract this whole distance/alpha thing as its own thing.
      //  2. refactor the other places that could use the spite directly, rather than having to recalculate its position.
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

      // TODO: play ghost appears animation without looping if the ghost sprite's alpha is > 0.
      //  Otherwise simply jump to the relevant frame.
      await delay(1000);

      // Try to anticipate the player's movement
      const ghostTargetCoords: Coords = {
        x: playerInstance.x + (playerInstance.movementState.action === 'running' ?
          playerInstance.movementState.vectorX :
          0),
        y: playerInstance.y + (playerInstance.movementState.action === 'running' ?
          playerInstance.movementState.vectorY :
          0),
      };

      const ghostTargetCell = ghostInstance.pathfinder.getGridCellAt(ghostTargetCoords.x, ghostTargetCoords.y);
      ghostInstance.setIsAlive(true);
      await ghostInstance.moveTo(ghostTargetCell, ghostSpeed);
      // TODO: play ghost moves animation without looping.

      ghostInstance.setIsAlive(false);
      await delay(1000);
      ghostSprite.alpha = 0; // TODO: replace this with playing the ghost disappear animation without looping (move it above the delay).


      const newGhostSpawnWait = randomInt(
        subsequentGhostMsWaitUntilSpawn.base,
        subsequentGhostMsWaitUntilSpawn.base + subsequentGhostMsWaitUntilSpawn.jitter,
      );

      subsequentGhostMsWaitUntilSpawn.base = Math.max(subsequentGhostMsWaitUntilSpawn.base - 500, 2000);
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
        critters,
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

    // for (const ghost of ghosts) {
    //   ghostBehaviour(ghost, { instance: player, sprite: playerSprite }, critters);
    // }

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
            <div class={'absolute top-0 left-0 bg-slate-800 w-full h-full ' +
              'grid grid-cols-1 gap-8 content-center z-30 '}>
              <p class={'text-2xl sm:text-3xl md:text-4xl leading-none text-slate-400 antialiased'}
                style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                Congrats, you're full! *burp* Play again?
              </p>
              <EnterButton onClick={() => location.reload()} isDisabled={false} />
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
            <div
              class={'bg-slate-800 h-full w-full ' +
                   'grid grid-cols-1 content-center z-30 '}>
              <div class={'w-1/2 text-left fixed bottom-[60%] left-1/4'}>
                <p class={'text-3xl md:text-4xl leading-none text-slate-400 antialiased relative'}>
                  {
                    !finishedTypingLineOne() && <span class={'animate-pulse absolute -left-5'}>&gt; </span>
                  }
                  <span style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    {lineOne()}
                  </span>
                  {
                    !finishedTypingLineOne() && <span>_</span>
                  }
                </p>
                <p class={'text-3xl md:text-4xl leading-none text-slate-400 antialiased relative'}>
                  {
                    finishedTypingLineOne() && <span class={'animate-pulse absolute -left-5'}>&gt; </span>
                  }
                  <span style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
                    {lineTwo()}
                  </span>
                  { finishedTypingLineOne() &&
                    <span classList={{
                      'animate-pulse': finishedTypingLineTwo(),
                    }}>_</span>
                  }
                </p>
              </div>
              <div class={'grid grid-cols-1 gap-8 content-center'}>
                {
                  <EnterButton onClick={() => startGame()}
                    isDisabled={!(finishedLoading() && finishedTypingLineTwo())} />
                }
              </div>
            </div>
          }
          {
            finishedLoading() && isGameStarted() &&
            <>
              <div class={'absolute top-5 left-[3%] text-left z-20 ' +
                'p-3 rounded bg-slate-700/30 ' +
                'outline outline-offset-2 outline-slate-700 '}>
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
