export enum CharacterTrait {
  SPEED = 'speed',
  SIGHT = 'sight'
}

export enum BuffName {
  MILK = 'Milk can',
  BLOBFISH = 'Blobfish'
}

export interface CharacterBuff {
  name: BuffName;
  description: string;
  traits: {[key in CharacterTrait]?: number};
  stacks: number;
  spriteImage: string;
  incrementStacks: () => void;
}

export const getMilkCanBuff = (): CharacterBuff => {
  let stacks = 1;

  const incrementStacks = () => {
    stacks++;
  };

  return {
    name: BuffName.MILK,
    description: 'Improves your speed by a large amount.',
    traits: {
      'speed': 75,
    },
    spriteImage: '/assets/buffs/milk.png',
    stacks,
    incrementStacks,
  };
};

export const getBlobfishBuff = (): CharacterBuff => {
  let stacks = 1;

  const incrementStacks = () => {
    stacks++;
  };

  return {
    name: BuffName.BLOBFISH,
    description: 'Improves your speed and sight by a small amount.',
    traits: {
      'speed': 25,
      'sight': 0.25,
    },
    spriteImage: '/assets/buffs/blobfish.png',
    stacks,
    incrementStacks,
  };
};
