// @flow

function getClassNames(selectors: any, classes?: string) {
  return classes ? selectors.concat(classes.split(' ')) : selectors
}

function getClassNamesFromTestRenderer(selectors, { props = {} }) {
  return getClassNames(selectors, props.className || props.class)
}

function shouldDive(node) {
  return typeof node.dive === 'function' && typeof node.type() !== 'string'
}

function isTagWithClassName(node) {
  return node.prop('className') && typeof node.type() === 'string'
}

function getClassNamesFromEnzyme(selectors, node) {
  // We need to dive if we have selected a styled child from a shallow render
  const actualComponent = shouldDive(node) ? node.dive() : node
  // Find the first node with a className prop
  const components = actualComponent.findWhere(isTagWithClassName)
  const classes = components.length && components.first().prop('className')

  return getClassNames(selectors, classes)
}

function getClassNamesFromCheerio(selectors, node) {
  const classes = node.attr('class')
  return getClassNames(selectors, classes)
}

function getClassNamesFromDOMElement(selectors, node: any) {
  return getClassNames(selectors, node.getAttribute('class'))
}

export function isReactElement(val: any): boolean {
  return val.$$typeof === Symbol.for('react.test.json')
}

const domElementPattern = /^((HTML|SVG)\w*)?Element$/

export function isDOMElement(val: any): boolean {
  return (
    val.nodeType === 1 &&
    val.constructor &&
    val.constructor.name &&
    domElementPattern.test(val.constructor.name)
  )
}

function isEnzymeElement(val: any): boolean {
  return typeof val.findWhere === 'function'
}

function isCheerioElement(val: any): boolean {
  return val.cheerio === '[cheerio object]'
}

export function getClassNamesFromNodes(nodes: Array<any>) {
  return nodes.reduce((selectors, node) => {
    if (isReactElement(node)) {
      return getClassNamesFromTestRenderer(selectors, node)
    } else if (isEnzymeElement(node)) {
      return getClassNamesFromEnzyme(selectors, node)
    } else if (isCheerioElement(node)) {
      return getClassNamesFromCheerio(selectors, node)
    }
    return getClassNamesFromDOMElement(selectors, node)
  }, [])
}

let keyframesPattern = /^@keyframes\s+(animation-[^{\s]+)+/

let removeCommentPattern = /\/\*[\s\S]*?\*\//g

export function getStylesFromClassNames(
  classNames: Array<string>,
  elements: Array<HTMLStyleElement>
): string {
  if (!classNames.length) {
    return ''
  }
  let keys = getKeys(elements)
  if (!keys.length) {
    return ''
  }

  let keyPatten = new RegExp(`^(${keys.join('|')})-`)
  let filteredClassNames = classNames.filter(className =>
    keyPatten.test(className)
  )
  if (!filteredClassNames.length) {
    return ''
  }
  let selectorPattern = new RegExp('\\.(' + filteredClassNames.join('|') + ')')
  let keyframes = {}
  let styles = ''

  elements.forEach(element => {
    let rule = element.textContent || ''
    if (selectorPattern.test(rule)) {
      styles += rule
    }
    let match = rule.match(keyframesPattern)
    if (match !== null) {
      let name = match[1]
      if (keyframes[name] === undefined) {
        keyframes[name] = ''
      }
      keyframes[name] += rule
    }
  })
  let keyframeNameKeys = Object.keys(keyframes)
  let keyframesStyles = ''

  if (keyframeNameKeys.length) {
    let keyframesNamePattern = new RegExp(keyframeNameKeys.join('|'), 'g')
    let keyframesNameCache = {}
    let index = 0

    styles = styles.replace(keyframesNamePattern, name => {
      if (keyframesNameCache[name] === undefined) {
        keyframesNameCache[name] = `animation-${index++}`
        keyframesStyles += keyframes[name]
      }
      return keyframesNameCache[name]
    })

    keyframesStyles = keyframesStyles.replace(keyframesNamePattern, value => {
      return keyframesNameCache[value]
    })
  }

  return (keyframesStyles + styles).replace(removeCommentPattern, '')
}

export function getStyleElements(): Array<HTMLStyleElement> {
  let elements = Array.from(document.querySelectorAll('style[data-emotion]'))
  // $FlowFixMe
  return elements
}

let unique = arr => Array.from(new Set(arr))

export function getKeys(elements: Array<HTMLStyleElement>) {
  let keys = unique(
    elements.map(
      element =>
        // $FlowFixMe we know it exists since we query for elements with this attribute
        (element.getAttribute('data-emotion'): string)
    )
  ).filter(Boolean)
  return keys
}
