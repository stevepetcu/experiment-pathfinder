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
      ghostLookingAroundTextures['gla-frame-00'],
      ghostLookingAroundTextures['gla-frame-01'],
      ghostLookingAroundTextures['gla-frame-02'],
      ghostLookingAroundTextures['gla-frame-03'],
      ghostLookingAroundTextures['gla-frame-04'],
      ghostLookingAroundTextures['gla-frame-05'],
      ghostLookingAroundTextures['gla-frame-06'],
      ghostLookingAroundTextures['gla-frame-07'],
      ghostLookingAroundTextures['gla-frame-08'],
      ghostLookingAroundTextures['gla-frame-09'],
      ghostLookingAroundTextures['gla-frame-10'],
      ghostLookingAroundTextures['gla-frame-11'],
      ghostLookingAroundTextures['gla-frame-12'],
    ],
    despawn: [
      ghostLookingAroundTextures['gla-frame-12'],
      ghostLookingAroundTextures['gla-frame-11'],
      ghostLookingAroundTextures['gla-frame-10'],
      ghostLookingAroundTextures['gla-frame-09'],
      ghostLookingAroundTextures['gla-frame-08'],
      ghostLookingAroundTextures['gla-frame-07'],
      ghostLookingAroundTextures['gla-frame-06'],
      ghostLookingAroundTextures['gla-frame-05'],
      ghostLookingAroundTextures['gla-frame-04'],
      ghostLookingAroundTextures['gla-frame-03'],
      ghostLookingAroundTextures['gla-frame-02'],
      ghostLookingAroundTextures['gla-frame-01'],
      Texture.EMPTY,
    ],
    running: [
      ghostRunningTextures['gr-running-00'],
      ghostRunningTextures['gr-running-01'],
      ghostRunningTextures['gr-running-02'],
      ghostRunningTextures['gr-running-03'],
      ghostRunningTextures['gr-running-04'],
      ghostRunningTextures['gr-running-05'],
    ],
  };
}

export function getCritterTextures(
  critterLookingAroundTextures: { [key: string]: Texture },
  critterRunningTextures: { [key: string]: Texture },
): CritterTextureMap {
  return {
    lookingAround: [
      critterLookingAroundTextures['cla-frame-00'],
      critterLookingAroundTextures['cla-frame-01'],
      critterLookingAroundTextures['cla-frame-02'],
      critterLookingAroundTextures['cla-frame-03'],
      critterLookingAroundTextures['cla-frame-04'],
      critterLookingAroundTextures['cla-frame-05'],
    ],
    running: {
      north: [
        critterRunningTextures['cr-north-00'],
        critterRunningTextures['cr-north-01'],
        critterRunningTextures['cr-north-02'],
        critterRunningTextures['cr-north-03'],
      ],
      south: [
        critterRunningTextures['cr-south-00'],
        critterRunningTextures['cr-south-01'],
        critterRunningTextures['cr-south-02'],
        critterRunningTextures['cr-south-03'],
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
        playerLookingAroundTextures['pla-north-0'],
        playerLookingAroundTextures['pla-north-2'],
        playerLookingAroundTextures['pla-north-4'],
        playerLookingAroundTextures['pla-north-3'],
        playerLookingAroundTextures['pla-north-1'],
      ],
      northeast: [
        playerLookingAroundTextures['pla-northeast-0'],
        playerLookingAroundTextures['pla-northeast-2'],
        playerLookingAroundTextures['pla-northeast-4'],
        playerLookingAroundTextures['pla-northeast-3'],
        playerLookingAroundTextures['pla-northeast-1'],
      ],
      east: [
        playerLookingAroundTextures['pla-east-0'],
        playerLookingAroundTextures['pla-east-2'],
        playerLookingAroundTextures['pla-east-4'],
        playerLookingAroundTextures['pla-east-3'],
        playerLookingAroundTextures['pla-east-1'],
      ],
      southeast: [
        playerLookingAroundTextures['pla-southeast-0'],
        playerLookingAroundTextures['pla-southeast-2'],
        playerLookingAroundTextures['pla-southeast-4'],
        playerLookingAroundTextures['pla-southeast-3'],
        playerLookingAroundTextures['pla-southeast-1'],
      ],
      south: [
        playerLookingAroundTextures['pla-south-0'],
        playerLookingAroundTextures['pla-south-2'],
        playerLookingAroundTextures['pla-south-4'],
        playerLookingAroundTextures['pla-south-3'],
        playerLookingAroundTextures['pla-south-1'],
      ],
      southwest: [
        playerLookingAroundTextures['pla-southwest-0'],
        playerLookingAroundTextures['pla-southwest-2'],
        playerLookingAroundTextures['pla-southwest-4'],
        playerLookingAroundTextures['pla-southwest-3'],
        playerLookingAroundTextures['pla-southwest-1'],
      ],
      west: [
        playerLookingAroundTextures['pla-west-0'],
        playerLookingAroundTextures['pla-west-2'],
        playerLookingAroundTextures['pla-west-4'],
        playerLookingAroundTextures['pla-west-3'],
        playerLookingAroundTextures['pla-west-1'],
      ],
      northwest: [
        playerLookingAroundTextures['pla-northwest-0'],
        playerLookingAroundTextures['pla-northwest-2'],
        playerLookingAroundTextures['pla-northwest-4'],
        playerLookingAroundTextures['pla-northwest-3'],
        playerLookingAroundTextures['pla-northwest-1'],
      ],
    },
    running: {
      north: [
        playerRunningTextures['pr-north-0'],
        playerRunningTextures['pr-north-1'],
        playerRunningTextures['pr-north-2'],
        playerRunningTextures['pr-north-3'],
        playerRunningTextures['pr-north-4'],
        playerRunningTextures['pr-north-5'],
        playerRunningTextures['pr-north-6'],
        playerRunningTextures['pr-north-7'],
      ],
      northeast: [
        playerRunningTextures['pr-northeast-0'],
        playerRunningTextures['pr-northeast-1'],
        playerRunningTextures['pr-northeast-2'],
        playerRunningTextures['pr-northeast-3'],
        playerRunningTextures['pr-northeast-4'],
        playerRunningTextures['pr-northeast-5'],
        playerRunningTextures['pr-northeast-6'],
        playerRunningTextures['pr-northeast-7'],
      ],
      east: [
        playerRunningTextures['pr-east-0'],
        playerRunningTextures['pr-east-1'],
        playerRunningTextures['pr-east-2'],
        playerRunningTextures['pr-east-3'],
        playerRunningTextures['pr-east-4'],
        playerRunningTextures['pr-east-5'],
        playerRunningTextures['pr-east-6'],
        playerRunningTextures['pr-east-7'],
      ],
      southeast: [
        playerRunningTextures['pr-southeast-0'],
        playerRunningTextures['pr-southeast-1'],
        playerRunningTextures['pr-southeast-2'],
        playerRunningTextures['pr-southeast-3'],
        playerRunningTextures['pr-southeast-4'],
        playerRunningTextures['pr-southeast-5'],
        playerRunningTextures['pr-southeast-6'],
        playerRunningTextures['pr-southeast-7'],
      ],
      south: [
        playerRunningTextures['pr-south-0'],
        playerRunningTextures['pr-south-1'],
        playerRunningTextures['pr-south-2'],
        playerRunningTextures['pr-south-3'],
        playerRunningTextures['pr-south-4'],
        playerRunningTextures['pr-south-5'],
        playerRunningTextures['pr-south-6'],
        playerRunningTextures['pr-south-7'],
      ],
      southwest: [
        playerRunningTextures['pr-southwest-0'],
        playerRunningTextures['pr-southwest-1'],
        playerRunningTextures['pr-southwest-2'],
        playerRunningTextures['pr-southwest-3'],
        playerRunningTextures['pr-southwest-4'],
        playerRunningTextures['pr-southwest-5'],
        playerRunningTextures['pr-southwest-6'],
        playerRunningTextures['pr-southwest-7'],
      ],
      west: [
        playerRunningTextures['pr-west-0'],
        playerRunningTextures['pr-west-1'],
        playerRunningTextures['pr-west-2'],
        playerRunningTextures['pr-west-3'],
        playerRunningTextures['pr-west-4'],
        playerRunningTextures['pr-west-5'],
        playerRunningTextures['pr-west-6'],
        playerRunningTextures['pr-west-7'],
      ],
      northwest: [
        playerRunningTextures['pr-northwest-0'],
        playerRunningTextures['pr-northwest-1'],
        playerRunningTextures['pr-northwest-2'],
        playerRunningTextures['pr-northwest-3'],
        playerRunningTextures['pr-northwest-4'],
        playerRunningTextures['pr-northwest-5'],
        playerRunningTextures['pr-northwest-6'],
        playerRunningTextures['pr-northwest-7'],
      ],
    },
  };
}
