export function handleCls(strings: TemplateStringsArray, ...expressions: any[]) {
  const result = strings.reduce((prev, current, currentIndex) => {
    const expression = expressions[currentIndex] || ''
    prev.push(current, expression)
    return prev
  }, [] as string[])
  return result.join('').trim()
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
export function glsl(strings: TemplateStringsArray, ...expressions: any[]) {
  return handleCls(strings, ...expressions)
}
