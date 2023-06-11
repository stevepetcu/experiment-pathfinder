import {Texture} from 'pixi.js';

export interface PlayerTextureMap {
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

export interface CritterTextureMap {
  lookingAround: Texture[],
  running: {
    north: Texture[],
    south: Texture[]
  }
}

export interface GhostTextureMap {
  spawn: Texture[],
  despawn: Texture[],
  running: Texture[],
}

export function getGhostTextures(
  ghostLookingAroundTextures: { [key: string]: Texture },
  ghostRunningTextures: { [key: string]: Texture },
): GhostTextureMap {
  return {
    spawn: [
      ghostLookingAroundTextures['frame_00'],
      ghostLookingAroundTextures['frame_01'],
      ghostLookingAroundTextures['frame_02'],
      ghostLookingAroundTextures['frame_03'],
      ghostLookingAroundTextures['frame_04'],
      ghostLookingAroundTextures['frame_05'],
      ghostLookingAroundTextures['frame_06'],
      ghostLookingAroundTextures['frame_07'],
      ghostLookingAroundTextures['frame_08'],
      ghostLookingAroundTextures['frame_09'],
      ghostLookingAroundTextures['frame_10'],
      ghostLookingAroundTextures['frame_11'],
      ghostLookingAroundTextures['frame_12'],
    ],
    despawn: [
      ghostLookingAroundTextures['frame_12'],
      ghostLookingAroundTextures['frame_11'],
      ghostLookingAroundTextures['frame_10'],
      ghostLookingAroundTextures['frame_09'],
      ghostLookingAroundTextures['frame_08'],
      ghostLookingAroundTextures['frame_07'],
      ghostLookingAroundTextures['frame_06'],
      ghostLookingAroundTextures['frame_05'],
      ghostLookingAroundTextures['frame_04'],
      ghostLookingAroundTextures['frame_03'],
      ghostLookingAroundTextures['frame_02'],
      ghostLookingAroundTextures['frame_01'],
      Texture.EMPTY,
    ],
    running: [
      ghostRunningTextures['running_00'],
      ghostRunningTextures['running_01'],
      ghostRunningTextures['running_02'],
      ghostRunningTextures['running_03'],
      ghostRunningTextures['running_04'],
      ghostRunningTextures['running_05'],
    ],
  };
}

export function getCritterTextures(
  critterLookingAroundTextures: { [key: string]: Texture },
  critterRunningTextures: { [key: string]: Texture },
): CritterTextureMap {
  return {
    lookingAround: [
      critterLookingAroundTextures['frame_00'],
      critterLookingAroundTextures['frame_01'],
      critterLookingAroundTextures['frame_02'],
      critterLookingAroundTextures['frame_03'],
      critterLookingAroundTextures['frame_04'],
      critterLookingAroundTextures['frame_05'],
    ],
    running: {
      north: [
        critterRunningTextures['north_00'],
        critterRunningTextures['north_01'],
        critterRunningTextures['north_02'],
        critterRunningTextures['north_03'],
      ],
      south: [
        critterRunningTextures['south_00'],
        critterRunningTextures['south_01'],
        critterRunningTextures['south_02'],
        critterRunningTextures['south_03'],
      ],
    },
  };
}

export function getPlayerTextures(
  playerLookingAroundTextures: { [key: string]: Texture },
  playerRunningTextures: { [key: string]: Texture },
): PlayerTextureMap {
  return {
    lookingAround: {
      north: [
        playerLookingAroundTextures['north-0'],
        playerLookingAroundTextures['north-2'],
        playerLookingAroundTextures['north-4'],
        playerLookingAroundTextures['north-3'],
        playerLookingAroundTextures['north-1'],
      ],
      northeast: [
        playerLookingAroundTextures['northeast-0'],
        playerLookingAroundTextures['northeast-2'],
        playerLookingAroundTextures['northeast-4'],
        playerLookingAroundTextures['northeast-3'],
        playerLookingAroundTextures['northeast-1'],
      ],
      east: [
        playerLookingAroundTextures['east-0'],
        playerLookingAroundTextures['east-2'],
        playerLookingAroundTextures['east-4'],
        playerLookingAroundTextures['east-3'],
        playerLookingAroundTextures['east-1'],
      ],
      southeast: [
        playerLookingAroundTextures['southeast-0'],
        playerLookingAroundTextures['southeast-2'],
        playerLookingAroundTextures['southeast-4'],
        playerLookingAroundTextures['southeast-3'],
        playerLookingAroundTextures['southeast-1'],
      ],
      south: [
        playerLookingAroundTextures['south-0'],
        playerLookingAroundTextures['south-2'],
        playerLookingAroundTextures['south-4'],
        playerLookingAroundTextures['south-3'],
        playerLookingAroundTextures['south-1'],
      ],
      southwest: [
        playerLookingAroundTextures['southwest-0'],
        playerLookingAroundTextures['southwest-2'],
        playerLookingAroundTextures['southwest-4'],
        playerLookingAroundTextures['southwest-3'],
        playerLookingAroundTextures['southwest-1'],
      ],
      west: [
        playerLookingAroundTextures['west-0'],
        playerLookingAroundTextures['west-2'],
        playerLookingAroundTextures['west-4'],
        playerLookingAroundTextures['west-3'],
        playerLookingAroundTextures['west-1'],
      ],
      northwest: [
        playerLookingAroundTextures['northwest-0'],
        playerLookingAroundTextures['northwest-2'],
        playerLookingAroundTextures['northwest-4'],
        playerLookingAroundTextures['northwest-3'],
        playerLookingAroundTextures['northwest-1'],
      ],
    },
    running: {
      north: [
        playerRunningTextures['north-0'],
        playerRunningTextures['north-1'],
        playerRunningTextures['north-2'],
        playerRunningTextures['north-3'],
        playerRunningTextures['north-4'],
        playerRunningTextures['north-5'],
        playerRunningTextures['north-6'],
        playerRunningTextures['north-7'],
      ],
      northeast: [
        playerRunningTextures['northeast-0'],
        playerRunningTextures['northeast-1'],
        playerRunningTextures['northeast-2'],
        playerRunningTextures['northeast-3'],
        playerRunningTextures['northeast-4'],
        playerRunningTextures['northeast-5'],
        playerRunningTextures['northeast-6'],
        playerRunningTextures['northeast-7'],
      ],
      east: [
        playerRunningTextures['east-0'],
        playerRunningTextures['east-1'],
        playerRunningTextures['east-2'],
        playerRunningTextures['east-3'],
        playerRunningTextures['east-4'],
        playerRunningTextures['east-5'],
        playerRunningTextures['east-6'],
        playerRunningTextures['east-7'],
      ],
      southeast: [
        playerRunningTextures['southeast-0'],
        playerRunningTextures['southeast-1'],
        playerRunningTextures['southeast-2'],
        playerRunningTextures['southeast-3'],
        playerRunningTextures['southeast-4'],
        playerRunningTextures['southeast-5'],
        playerRunningTextures['southeast-6'],
        playerRunningTextures['southeast-7'],
      ],
      south: [
        playerRunningTextures['south-0'],
        playerRunningTextures['south-1'],
        playerRunningTextures['south-2'],
        playerRunningTextures['south-3'],
        playerRunningTextures['south-4'],
        playerRunningTextures['south-5'],
        playerRunningTextures['south-6'],
        playerRunningTextures['south-7'],
      ],
      southwest: [
        playerRunningTextures['southwest-0'],
        playerRunningTextures['southwest-1'],
        playerRunningTextures['southwest-2'],
        playerRunningTextures['southwest-3'],
        playerRunningTextures['southwest-4'],
        playerRunningTextures['southwest-5'],
        playerRunningTextures['southwest-6'],
        playerRunningTextures['southwest-7'],
      ],
      west: [
        playerRunningTextures['west-0'],
        playerRunningTextures['west-1'],
        playerRunningTextures['west-2'],
        playerRunningTextures['west-3'],
        playerRunningTextures['west-4'],
        playerRunningTextures['west-5'],
        playerRunningTextures['west-6'],
        playerRunningTextures['west-7'],
      ],
      northwest: [
        playerRunningTextures['northwest-0'],
        playerRunningTextures['northwest-1'],
        playerRunningTextures['northwest-2'],
        playerRunningTextures['northwest-3'],
        playerRunningTextures['northwest-4'],
        playerRunningTextures['northwest-5'],
        playerRunningTextures['northwest-6'],
        playerRunningTextures['northwest-7'],
      ],
    },
  };
}
