const SECONDS_IN_A_MINUTE = 60;

const convertSeconds = (seconds: number): [number, number] => {
  const minutes = Math.floor((seconds/SECONDS_IN_A_MINUTE));
  const remainderSeconds = seconds % 60;

  return [minutes, remainderSeconds];
};

export const formatSeconds = (seconds: number): string => {
  const [minutes, remainderSeconds] = convertSeconds(seconds);

  const minutesString = minutes < 10 ? `0${minutes}` : minutes + '';
  const secondsString = remainderSeconds < 10 ? `0${remainderSeconds}` : remainderSeconds + '';

  return `${minutesString}:${secondsString}`;
};
