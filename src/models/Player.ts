export interface Player {
  x: number;
  y: number;
}
export const getPlayer = (startingX: number, startingY: number) => {
  const _this = {x: startingX, y: startingY};

  return _this;
};
