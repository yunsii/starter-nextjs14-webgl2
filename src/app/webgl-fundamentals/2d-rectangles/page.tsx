'use client'

import { useCallback, useEffect } from 'react'

import { randomInt, setRectangle } from './helpers'

import { glsl } from '@/helpers/glsl'
import { ensureNonNullable } from '@/helpers/common'
import { webglUtils } from '@/helpers/webgl-utils'

const vertexShaderSource = glsl`
  #version 300 es

  // an attribute is an input (in) to a vertex shader.
  // It will receive data from a buffer
  in vec2 a_position;

  // Used to pass in the resolution of the canvas
  uniform vec2 u_resolution;

  // all shaders have a main function
  void main() {

    // convert the position from pixels to 0.0 to 1.0
    vec2 zeroToOne = a_position / u_resolution;

    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;

    // 翻转 Y 轴，跟 canvas 默认的坐标系统对齐 https://www.w3schools.com/graphics/canvas_coordinates.asp
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`

const fragmentShaderSource = glsl`
  #version 300 es
  // fragment shaders don't have a default precision so we need
  // to pick one. highp is a good default. It means "high precision"
  precision highp float;

  uniform vec4 u_color;

  // we need to declare an output for the fragment shader
  out vec4 outColor;

  void main() {
    // Just set the output to a constant redish-purple
    outColor = u_color;
  }
`

export default function Page() {
  const render = useCallback(() => {
    // Get A WebGL context
    const canvas = document.querySelector<HTMLCanvasElement>('#c')
    const gl = ensureNonNullable(canvas?.getContext('webgl2'), 'gl')

    // Link the two shaders into a program
    const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource])

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position')

    // look up uniform locations
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution')
    const colorLocation = gl.getUniformLocation(program, 'u_color')

    // Create a buffer and put three 2d clip space points in it
    const positionBuffer = gl.createBuffer()

    // Create a vertex array object (attribute state)
    const vao = gl.createVertexArray()

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao)

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation)

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    const size = 2 // 2 components per iteration
    const type = gl.FLOAT // the data is 32bit floats
    const normalize = false // don't normalize the data
    const stride = 0 // 0 = move forward size * sizeof(type) each iteration to get the next position
    const offset = 0 // start at the beginning of the buffer
    gl.vertexAttribPointer(
      positionAttributeLocation,
      size,
      type,
      normalize,
      stride,
      offset,
    )

    if (gl.canvas instanceof OffscreenCanvas) {
      throw new TypeError('Unexpected OffscreenCanvas')
    }
    webglUtils.resizeCanvasToDisplaySize(gl.canvas)

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program)

    // Pass in the canvas resolution so we can convert from
    // pixels to clip space in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height)

    // draw 50 random rectangles in random colors
    for (let ii = 0; ii < 50; ++ii) {
    // Put a rectangle in the position buffer
      setRectangle(
        gl,
        randomInt(300),
        randomInt(300),
        randomInt(300),
        randomInt(300),
      )

      // Set a random color.
      gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1)

      // Draw the rectangle.
      const primitiveType = gl.TRIANGLES
      const drawOffset = 0
      const count = 6
      gl.drawArrays(primitiveType, drawOffset, count)
    }
  }, [])

  useEffect(() => {
    render()
  }, [render])

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <canvas id='c' className='border border-cyan-300' width={400} height={300} />
    </div>
  )
}
