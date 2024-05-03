'use client'

import { useCallback, useEffect } from 'react'

import { glsl } from '@/helpers/glsl'
import { ensureNonNullable } from '@/helpers/common'
import { webglUtils } from '@/helpers/webgl-utils'

const vertexShaderSource = glsl`
  #version 300 es

  // an attribute is an input (in) to a vertex shader.
  // It will receive data from a buffer
  in vec2 a_position;
  in vec2 a_texCoord;

  // Used to pass in the resolution of the canvas
  uniform vec2 u_resolution;

  // Used to pass the texture coordinates to the fragment shader
  out vec2 v_texCoord;

  // all shaders have a main function
  void main() {

    // convert the position from pixels to 0.0 to 1.0
    vec2 zeroToOne = a_position / u_resolution;

    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    // pass the texCoord to the fragment shader
    // The GPU will interpolate this value between points.
    v_texCoord = a_texCoord;
  }
`

const fragmentShaderSource = glsl`
  #version 300 es

  // fragment shaders don't have a default precision so we need
  // to pick one. highp is a good default. It means "high precision"
  precision highp float;

  // our texture
  uniform sampler2D u_image;

  // the texCoords passed in from the vertex shader.
  in vec2 v_texCoord;

  // we need to declare an output for the fragment shader
  out vec4 outColor;

  void main() {
    outColor = texture(u_image, v_texCoord);
  }
`

function setRectangle(gl: WebGL2RenderingContext, x: number, y: number, width: number, height: number) {
  const x1 = x
  const x2 = x + width
  const y1 = y
  const y2 = y + height
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1,
    y1,
    x2,
    y1,
    x1,
    y2,
    x1,
    y2,
    x2,
    y1,
    x2,
    y2,
  ]), gl.STATIC_DRAW)
}

export default function Page() {
  const render = useCallback((image: HTMLImageElement) => {
    // Get A WebGL context
    const canvas = document.querySelector<HTMLCanvasElement>('#c')
    const gl = ensureNonNullable(canvas?.getContext('webgl2'), 'gl')

    // Link the two shaders into a program
    const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource])

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position')
    const texCoordAttributeLocation = gl.getAttribLocation(program, 'a_texCoord')

    // lookup uniforms
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const imageLocation = gl.getUniformLocation(program, 'u_image')

    // Create a vertex array object (attribute state)
    const vao = gl.createVertexArray()

    // and make it the one we're currently working with
    gl.bindVertexArray(vao)

    // Create a buffer and put a single pixel space rectangle in
    // it (2 triangles)
    const positionBuffer = gl.createBuffer()

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation)

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    const positionSize = 2 // 2 components per iteration
    const positionType = gl.FLOAT // the data is 32bit floats
    const positionNormalize = false // don't normalize the data
    const positionStride = 0 // 0 = move forward size * sizeof(type) each iteration to get the next position
    const positionOffset = 0 // start at the beginning of the buffer
    gl.vertexAttribPointer(
      positionAttributeLocation,
      positionSize,
      positionType,
      positionNormalize,
      positionStride,
      positionOffset,
    )

    // provide texture coordinates for the rectangle.
    const texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      1.0,
    ]), gl.STATIC_DRAW)

    // Turn on the attribute
    gl.enableVertexAttribArray(texCoordAttributeLocation)

    // Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
    const texSize = 2 // 2 components per iteration
    const texType = gl.FLOAT // the data is 32bit floats
    const texNormalize = false // don't normalize the data
    const texStride = 0 // 0 = move forward size * sizeof(type) each iteration to get the next position
    const texOffset = 0 // start at the beginning of the buffer
    gl.vertexAttribPointer(
      texCoordAttributeLocation,
      texSize,
      texType,
      texNormalize,
      texStride,
      texOffset,
    )

    // Create a texture.
    const texture = gl.createTexture()

    // make unit 0 the active texture uint
    // (ie, the unit all other texture commands will affect
    gl.activeTexture(gl.TEXTURE0 + 0)

    // Bind it to texture unit 0' 2D bind point
    gl.bindTexture(gl.TEXTURE_2D, texture)

    // Set the parameters so we don't need mips and so we're not filtering
    // and we don't repeat at the edges
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Upload the image into the texture.
    const mipLevel = 0 // the largest mip
    const internalFormat = gl.RGBA // format we want in the texture
    const srcFormat = gl.RGBA // format of data we are supplying
    const srcType = gl.UNSIGNED_BYTE // type of data we are supplying
    gl.texImage2D(gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, image)

    if (gl.canvas instanceof OffscreenCanvas) {
      throw new TypeError('Unexpected OffscreenCanvas')
    }
    webglUtils.resizeCanvasToDisplaySize(gl.canvas)

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program)

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao)

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height)

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(imageLocation, 0)

    // Bind the position buffer so gl.bufferData that will be called
    // in setRectangle puts data in the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    // Set a rectangle the same size as the image.
    setRectangle(gl, 0, 0, image.width, image.height)

    // Draw the rectangle.
    const primitiveType = gl.TRIANGLES
    const offset = 0
    const count = 6
    gl.drawArrays(primitiveType, offset, count)
  }, [])

  useEffect(() => {
    const image = new Image()
    image.src = 'https://webgl2fundamentals.org/webgl/resources/leaves.jpg' // MUST BE SAME DOMAIN!!!
    image.crossOrigin = 'true'
    image.onload = function () {
      render(image)
    }
  }, [render])

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <canvas id='c' className='border border-cyan-300' width={400} height={300} />
    </div>
  )
}
