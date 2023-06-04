export interface CharacterBuff {
  affects: 'speed';
  magnitude: number;
  spriteImage: string;
}

export const getMilkCanBuff = (): CharacterBuff => {
  return {affects: 'speed', magnitude: 0.7, spriteImage: '/assets/buffs/milk.png'};
};
