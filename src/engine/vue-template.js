// Vue single file component templates.
//
// This reads elements and attributes out of a template block. It is not a full
// Vue compiler, and it does not try to be: pulling in @vue/compiler-sfc would
// roughly double the bundle for rules that only ever look at attribute names
// and their expressions.
//
// What it does handle: nested elements, quoted and unquoted attribute values,
// shorthand bindings (: and @ and #), comments, and self closing tags. What it
// does not: dynamic attribute names such as :[key], and expressions spanning
// interpolation. Those come out as no match rather than a wrong match, so the
// failure direction is a missed finding and never a false one.
//
// Offsets are absolute into the original file, so line numbers need no mapping.

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Find the top level <template> block. Nested templates inside it are part of
 * the content and are not treated as the block boundary.
 */
export function extractTemplateBlock(source) {
  const open = /<template(\s[^>]*)?>/i.exec(source);
  if (!open) return null;

  const contentStart = open.index + open[0].length;

  let depth = 1;
  let cursor = contentStart;
  const tag = /<\/?template(\s[^>]*)?>/gi;
  tag.lastIndex = contentStart;

  let match;
  while ((match = tag.exec(source)) !== null) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) {
        return { start: contentStart, end: match.index, content: source.slice(contentStart, match.index) };
      }
    } else {
      depth += 1;
    }
    cursor = tag.lastIndex;
  }

  void cursor;
  return { start: contentStart, end: source.length, content: source.slice(contentStart) };
}

function parseAttributes(text, base) {
  const attributes = [];
  let i = 0;

  while (i < text.length) {
    while (i < text.length && /[\s/]/.test(text[i])) i += 1;
    if (i >= text.length) break;

    const nameStart = i;
    while (i < text.length && !/[\s=/>]/.test(text[i])) i += 1;
    const name = text.slice(nameStart, i);
    if (!name) break;

    let value = null;
    let valueStart = null;

    let lookahead = i;
    while (lookahead < text.length && /\s/.test(text[lookahead])) lookahead += 1;

    if (text[lookahead] === '=') {
      lookahead += 1;
      while (lookahead < text.length && /\s/.test(text[lookahead])) lookahead += 1;

      const quote = text[lookahead];
      if (quote === '"' || quote === "'") {
        const close = text.indexOf(quote, lookahead + 1);
        if (close !== -1) {
          valueStart = base + lookahead + 1;
          value = text.slice(lookahead + 1, close);
          i = close + 1;
        } else {
          i = lookahead + 1;
        }
      } else {
        const valueEnd = (() => {
          let j = lookahead;
          while (j < text.length && !/[\s>]/.test(text[j])) j += 1;
          return j;
        })();
        valueStart = base + lookahead;
        value = text.slice(lookahead, valueEnd);
        i = valueEnd;
      }
    }

    attributes.push({ name, value, nameStart: base + nameStart, valueStart });
  }

  return attributes;
}

/**
 * Blank out whole blocks, keeping newlines and every offset in place. Used to
 * take script and style out of a Svelte file so only markup is left.
 */
export function blankBlocks(source, tags) {
  const buffer = Array.from(source);

  for (const tag of tags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
    let match;
    while ((match = pattern.exec(source)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i += 1) {
        if (buffer[i] !== '\n') buffer[i] = ' ';
      }
    }
  }

  return buffer.join('');
}

/**
 * Where the markup lives. Vue keeps it in a <template> block. Svelte has no
 * wrapper, so it is everything that is not script or style.
 */
export function markupRegion(source, kind = 'vue') {
  if (kind === 'svelte') {
    return { start: 0, end: source.length, content: blankBlocks(source, ['script', 'style']) };
  }
  return extractTemplateBlock(source);
}

/**
 * Walk the markup and hand back every element with its attributes.
 * Offsets are absolute into the original source.
 */
export function scanTemplate(source, kind = 'vue') {
  const block = markupRegion(source, kind);
  if (!block) return [];

  const elements = [];
  const content = block.content;
  let i = 0;

  while (i < content.length) {
    const open = content.indexOf('<', i);
    if (open === -1) break;

    // Skip comments and closing tags.
    if (content.startsWith('<!--', open)) {
      const close = content.indexOf('-->', open);
      i = close === -1 ? content.length : close + 3;
      continue;
    }
    if (content[open + 1] === '/' || content[open + 1] === '!') {
      const close = content.indexOf('>', open);
      i = close === -1 ? content.length : close + 1;
      continue;
    }

    // Find the end of the tag, ignoring > inside quoted attribute values.
    let j = open + 1;
    let quote = null;
    while (j < content.length) {
      const ch = content[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      j += 1;
    }
    if (j >= content.length) break;

    const raw = content.slice(open + 1, j);
    const nameMatch = /^[A-Za-z][\w.-]*/.exec(raw);
    if (!nameMatch) {
      i = j + 1;
      continue;
    }

    const tagName = nameMatch[0];
    const attributeText = raw.slice(tagName.length);
    const attributes = parseAttributes(attributeText, block.start + open + 1 + tagName.length);

    elements.push({
      tagName,
      attributes,
      start: block.start + open,
      end: block.start + j + 1,
      selfClosing: raw.trimEnd().endsWith('/') || VOID_ELEMENTS.has(tagName.toLowerCase()),
    });

    i = j + 1;
  }

  return elements;
}

/** Normalise `:href`, `v-bind:href`, and `href` to the plain name. */
export function bindingName(attributeName) {
  if (attributeName.startsWith('v-bind:')) return attributeName.slice(7);
  if (attributeName.startsWith(':')) return attributeName.slice(1);
  return attributeName;
}

export function isBinding(attributeName) {
  return attributeName.startsWith(':') || attributeName.startsWith('v-bind:');
}

export function findAttribute(element, name) {
  return element.attributes.find(
    (attribute) => attribute.name === name || bindingName(attribute.name) === name,
  );
}
