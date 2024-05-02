/* eslint-disable eslint-comments/no-unlimited-disable */

// Returns a random integer from 0 to range - 1.
export function randomInt(range: number) {
  return Math.floor(Math.random() * range)
}

// Fill the buffer with the values that define a rectangle.
export function setRectangle(gl: WebGL2RenderingContext, x: number, y: number, width: number, height: number) {
  const x1 = x
  const x2 = x + width
  const y1 = y
  const y2 = y + height
  /* eslint-disable */ 
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2,
  ]), gl.STATIC_DRAW);
  /* eslint-enable */
}
