// ref: https://webgl2fundamentals.org/webgl/resources/webgl-utils.js

import { glEnumToString } from 'twgl.js'

import { ensureNonNullable } from './common'

type ErrorCallback = (msg: string) => void

function getTopWindow() {
  return window.top?.window
}

function isInIFrame() {
  return window !== getTopWindow()
}

/**
 * Wrapped logging function.
 * @param {string} msg The message to log.
 */
function error(msg: string) {
  const topWindow = getTopWindow()
  if (topWindow?.console) {
    if (topWindow.console.error) {
      topWindow.console.error(msg)
    }
    else if (topWindow.console.log) {
      topWindow.console.log(msg)
    }
  }
}

const errorRE = /ERROR:\s*\d+:(\d+)/gi
function addLineNumbersWithError(src: string, log = '') {
  // Note: Error message formats are not defined by any spec so this may or may not work.
  const matches = Array.from(log.matchAll(errorRE))
  const lineNoToErrorMap = new Map(matches.map((m, ndx) => {
    const lineNo = Number.parseInt(m[1])
    const next = matches[ndx + 1]
    const end = next ? next.index : log.length
    const msg = log.substring(m.index, end)
    return [lineNo - 1, msg]
  }))
  return src.split('\n').map((line, lineNo) => {
    const err = lineNoToErrorMap.get(lineNo)
    return `${lineNo + 1}: ${line}${err ? `\n\n^^^ ${err}` : ''}`
  }).join('\n')
}

/**
 * Loads a shader.
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext to use.
 * @param {string} shaderSource The shader source.
 * @param {number} shaderType The type of shader.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors.
 * @return {WebGLShader} The created shader.
 */
function loadShader(gl: WebGL2RenderingContext, shaderSource: string, shaderType: number, opt_errorCallback?: ErrorCallback) {
  const errFn = opt_errorCallback || error
  // Create the shader object
  const shader = ensureNonNullable(gl.createShader(shaderType), 'shader')

  // Load the shader source
  gl.shaderSource(shader, shaderSource)

  // Compile the shader
  gl.compileShader(shader)

  // Check the compile status
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!compiled) {
    // Something went wrong during compilation; get the error
    const lastError = gl.getShaderInfoLog(shader) || ''
    errFn(`Error compiling shader: ${lastError}\n${addLineNumbersWithError(shaderSource, lastError)}`)
    gl.deleteShader(shader)
    return null
  }

  return shader
}

/**
 * Creates a program, attaches shaders, binds attrib locations, links the
 * program and calls useProgram.
 * @param {WebGLShader[]} shaders The shaders to attach
 * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
 * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
 *        on error. If you want something else pass an callback. It's passed an error message.
 * @memberOf module:webgl-utils
 */
function createProgram(
  gl: WebGL2RenderingContext,
  shaders: WebGLShader[],
  opt_attribs?: string[],
  opt_locations?: number[],
  opt_errorCallback?: ErrorCallback,
) {
  const errFn = opt_errorCallback || error
  const program = ensureNonNullable(gl.createProgram(), 'program')
  shaders.forEach((shader) => {
    gl.attachShader(program, shader)
  })
  if (opt_attribs) {
    opt_attribs.forEach((attrib, ndx) => {
      gl.bindAttribLocation(
        program,
        opt_locations ? opt_locations[ndx] : ndx,
        attrib,
      )
    })
  }
  gl.linkProgram(program)

  // Check the link status
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!linked) {
    // something went wrong with the link
    const lastError = gl.getProgramInfoLog(program)
    errFn(`Error in program linking: ${lastError}\n${
        shaders.map((shader) => {
          const src = addLineNumbersWithError(gl.getShaderSource(shader) || '')
          const type = gl.getShaderParameter(shader, gl.SHADER_TYPE)
          return `${glEnumToString(gl, type)}:\n${src}`
        }).join('\n')
      }`)

    gl.deleteProgram(program)
    return null
  }
  return program
}

const defaultShaderType = [
  'VERTEX_SHADER',
  'FRAGMENT_SHADER',
] as const

/**
 * Creates a program from 2 sources.
 *
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext
 *        to use.
 * @param {string[]} shaderSources Array of sources for the
 *        shaders. The first is assumed to be the vertex shader,
 *        the second the fragment shader.
 * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
 * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
 *        on error. If you want something else pass an callback. It's passed an error message.
 * @return {WebGLProgram} The created program.
 * @memberOf module:webgl-utils
 */
function createProgramFromSources(
  gl: WebGL2RenderingContext,
  shaderSources: string[],
  opt_attribs?: string[],
  opt_locations?: number[],
  opt_errorCallback?: ErrorCallback,
) {
  const shaders: WebGLShader[] = []
  for (let ii = 0; ii < shaderSources.length; ++ii) {
    const shader = loadShader(
      gl,
      shaderSources[ii],
      gl[defaultShaderType[ii]],
      opt_errorCallback,
    )
    if (shader) {
      shaders.push(shader)
    }
  }
  const program = ensureNonNullable(createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback), 'program')
  return program
}

/**
 * Resize a canvas to match the size its displayed.
 * @param {HTMLCanvasElement} canvas The canvas to resize.
 * @param {number} [multiplier] amount to multiply by.
 *    Pass in window.devicePixelRatio for native pixels.
 * @return {boolean} true if the canvas was resized.
 * @memberOf module:webgl-utils
 */
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, multiplier?: number) {
  multiplier = multiplier || 1
  const width = canvas.clientWidth * multiplier | 0
  const height = canvas.clientHeight * multiplier | 0
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    return true
  }
  return false
}

export const webglUtils = {
  createProgram,
  createProgramFromSources,
  resizeCanvasToDisplaySize,
}
