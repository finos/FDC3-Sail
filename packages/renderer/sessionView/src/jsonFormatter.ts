const MODE = {
  START: 'open',
  BETWEEN: 'between',
  END: 'end',
  STRING_SINGLE: 'string_single',
  STRING_DOUBLE: 'string_double',
  ESCAPE_IN_SINGLE: 'escape_in_single',
  ESCAPE_IN_DOUBLE: 'escape_in_double',
};

const HIERARCHY = {
  OBJECT: 'object',
  ARRAY: 'array',
};

const HierarchyByToken = {
  '[': HIERARCHY.ARRAY,
  ']': HIERARCHY.ARRAY,
  '{': HIERARCHY.OBJECT,
  '}': HIERARCHY.OBJECT,
};

export const ERROR_MESSAGE = {
  EMPTY_INPUT: 'Empty input! Expect a json string.',
  INVALID_INPUT: "Invalid input json! Your input doesn't match json schema.",
  NOT_CLOSED_INPUT: 'Invalid input json! Your input is not closed.',
  UNEXPECTE: 'Unexpected error!',
};

function createIndents(indent: string, n: number) {
  if (!indent) {
    return '';
  }
  return Array(n + 1).join(indent);
}

/**
 * Format the given json string with specified 'indent' and 'linebreak'.
 *
 * @param {string} jstring Input json in string format.
 * @returns {string} The transformed json string.
 */
export const formatJSON: (json: string) => string = (
  jstring: string,
): string => {
  if (!jstring) {
    throw new Error(ERROR_MESSAGE.EMPTY_INPUT);
  }
  const indent = '   ';
  const linebreak = '\n';
  const input = jstring.trim();
  let output = '';
  const hierarchyStack = [];

  let mode = MODE.START;
  const new_line = linebreak || '';
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    switch (mode) {
      case MODE.START:
        switch (ch) {
          case '{':
          case '[':
            mode = MODE.BETWEEN;
            i--;
            break;
          case ' ':
          case '\t':
          case '\n':
            break;
          default:
            throw new Error(ERROR_MESSAGE.INVALID_INPUT);
            break;
        }
        break;

      case MODE.BETWEEN:
        switch (ch) {
          case '{':
          case '[':
            output += ch + new_line;
            depth++;
            hierarchyStack.push(HierarchyByToken[ch]);
            output += createIndents(indent, depth);
            break;
          case '}':
          case ']':
            output += new_line;
            depth--;
            output += createIndents(indent, depth) + ch;
            if (hierarchyStack.pop() !== HierarchyByToken[ch]) {
              throw new Error(ERROR_MESSAGE.NOT_CLOSED_INPUT);
            }
            if (depth === 0) {
              mode = MODE.END;
            }
            break;
          case ',':
            output += ch + new_line;
            output += createIndents(indent, depth);
            break;
          case ':':
            output += ch + ' ';
            break;
          case "'":
            output += ch;
            mode = MODE.STRING_SINGLE;
            break;
          case '"':
            output += ch;
            mode = MODE.STRING_DOUBLE;
            break;
          case ' ':
          case '\n':
          case '\t':
          case '\r':
            break;
          default:
            output += ch;
            break;
        }
        break;

      case MODE.END:
        switch (ch) {
          case ' ':
          case '\t':
          case '\n':
          case '\r':
            break;
          default:
            throw new Error(ERROR_MESSAGE.NOT_CLOSED_INPUT);
        }
        break;

      case MODE.STRING_SINGLE:
        output += ch;
        switch (ch) {
          case "'":
            mode = MODE.BETWEEN;
            break;
          case '\\':
            mode = MODE.ESCAPE_IN_SINGLE;
            break;
        }
        break;

      case MODE.STRING_DOUBLE:
        output += ch;
        switch (ch) {
          case '"':
            mode = MODE.BETWEEN;
            break;
          case '\\':
            mode = MODE.ESCAPE_IN_DOUBLE;
            break;
        }
        break;

      case MODE.ESCAPE_IN_SINGLE:
        output += ch;
        mode = MODE.STRING_SINGLE;
        break;

      case MODE.ESCAPE_IN_DOUBLE:
        output += ch;
        mode = MODE.STRING_DOUBLE;
        break;
    }
  }

  if (depth !== 0) {
    throw new Error(ERROR_MESSAGE.NOT_CLOSED_INPUT);
  }
  return output;
};
