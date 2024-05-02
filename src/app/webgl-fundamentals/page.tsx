/* eslint-disable eslint-comments/no-unlimited-disable */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createProgram } from 'twgl.js'
import Image from 'next/image'

import { glsl } from '@/helpers/glsl'
import { ensureNonNullable } from '@/helpers/common'
import { webglUtils } from '@/helpers/webgl-utils'

const vertexShaderSource = glsl`
  #version 300 es

  // an attribute is an input (in) to a vertex shader.
  // It will receive data from a buffer
  in vec4 a_position;

  // all shaders have a main function
  void main() {

    // gl_Position is a special variable a vertex shader
    // is responsible for setting
    gl_Position = a_position;
  }
`

const fragmentShaderSource = glsl`
  #version 300 es

  // fragment shaders don't have a default precision so we need
  // to pick one. highp is a good default. It means "high precision"
  precision highp float;

  // we need to declare an output for the fragment shader
  out vec4 outColor;

  void main() {
    // Just set the output to a constant reddish-purple
    outColor = vec4(1, 0, 0.5, 1);
  }
`

export default function Page() {
  const [capture, setCapture] = useState<string | null>(null)

  const draw = useCallback(() => {
    // Get A WebGL context
    const canvas = document.querySelector<HTMLCanvasElement>('#c')
    const gl = ensureNonNullable(canvas?.getContext('webgl2', {
      // 设置该属性为 true 时，canvas.toDataURL() 才能得到 webgl 绘制的内容
      preserveDrawingBuffer: true,
    }), 'gl')

    // Link the two shaders into a program
    const program = createProgram(gl, [vertexShaderSource, fragmentShaderSource])

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position')

    // Create a buffer and put three 2d clip space points in it
    const positionBuffer = gl.createBuffer()

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    /* eslint-disable */
    // three 2d points
    const positions = [
      0, 0,
      0, 0.5,
      0.7, 0,
    ]
     /* eslint-enable */
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    // Create a vertex array object (attribute state)
    const vao = gl.createVertexArray()

    // and make it the one we're currently working with
    gl.bindVertexArray(vao)

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation)

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

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao)

    // draw
    const primitiveType = gl.TRIANGLES
    const drawOffset = 0
    const count = 3
    gl.drawArrays(primitiveType, drawOffset, count)
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <canvas id='c' className='border border-cyan-300' width={400} height={300} />
      <div>
        <button
          type='button'
          onClick={() => {
            const canvas = document.querySelector<HTMLCanvasElement>('#c')!
            const imageDataUrl = canvas.toDataURL()
            setCapture(imageDataUrl)
          }}
          className='border border-cyan-500'
        >
          capture
        </button>
        {capture && <Image src={capture} width={400} height={300} alt='capture' className='border border-cyan-300' />}
      </div>
    </div>
  )
}
