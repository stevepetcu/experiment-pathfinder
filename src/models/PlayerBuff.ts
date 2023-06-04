
export interface PlayerBuff {
  affects: 'speed';
  magnitude: number;
  spriteImage: string;
}

export const getMilkCanBuff = (): PlayerBuff => {
  return {affects: 'speed', magnitude: 0.7, spriteImage: '/assets/buffs/milk.png'};
};
