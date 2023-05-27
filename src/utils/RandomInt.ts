/**
 * Generate a random integer between min (included) and max (excluded).
 *
 * @param min
 * @param max
 */
export default function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}
