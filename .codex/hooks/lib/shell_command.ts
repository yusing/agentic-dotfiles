export const VERSION = "1.0.0";

export const SHELLS = new Set(["bash", "dash", "sh", "zsh"]);
const COMMAND_PREFIXES = new Set(["!", "do", "elif", "exec", "if", "then"]);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SEPARATORS = new Set([";", "&", "|", "(", ")", "{", "}", "\n"]);
const PUNCTUATION = new Set([";", "&", "|", "(", ")", "{", "}", "\n"]);
const WHITESPACE = new Set([" ", "\t", "\r"]);

export function isSeparatorToken(token: string): boolean {
  return token.length > 0 && [...token].every((character) => SEPARATORS.has(character));
}

export function shellTokens(command: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  const pushToken = (token: string): void => {
    if (token.length > 0) {
      tokens.push(token);
    }
  };

  try {
    while (index < command.length) {
      while (index < command.length && WHITESPACE.has(command[index] ?? "")) {
        index += 1;
      }
      if (index >= command.length) {
        break;
      }

      const start = command[index] ?? "";
      if (PUNCTUATION.has(start)) {
        let end = index + 1;
        while (end < command.length && PUNCTUATION.has(command[end] ?? "")) {
          end += 1;
        }
        pushToken(command.slice(index, end));
        index = end;
        continue;
      }

      if (start === "'" || start === '"') {
        const [quoted, next] = readQuoted(command, index);
        pushToken(quoted);
        index = next;
        continue;
      }

      let token = "";
      while (index < command.length) {
        const character = command[index] ?? "";
        if (WHITESPACE.has(character) || PUNCTUATION.has(character)) {
          break;
        }
        if (character === "'" || character === '"') {
          const [quoted, next] = readQuoted(command, index);
          token += quoted;
          index = next;
          continue;
        }
        if (character === "\\") {
          if (index + 1 >= command.length) {
            throw new Error("unterminated escape");
          }
          token += command[index + 1] ?? "";
          index += 2;
          continue;
        }
        token += character;
        index += 1;
      }
      pushToken(token);
    }
  } catch {
    return [];
  }
  return tokens;
}

function readQuoted(command: string, start: number): [string, number] {
  const quote = command[start];
  if (quote !== "'" && quote !== '"') {
    throw new Error("not a quote");
  }
  let index = start + 1;
  let value = "";
  if (quote === "'") {
    while (index < command.length) {
      const character = command[index] ?? "";
      if (character === "'") {
        return [value, index + 1];
      }
      value += character;
      index += 1;
    }
    throw new Error("unterminated quote");
  }

  while (index < command.length) {
    const character = command[index] ?? "";
    if (character === '"') {
      return [value, index + 1];
    }
    if (character === "\\") {
      if (index + 1 >= command.length) {
        throw new Error("unterminated escape");
      }
      const next = command[index + 1] ?? "";
      if ('$`"\\\n'.includes(next)) {
        value += next;
      } else {
        value += `\\${next}`;
      }
      index += 2;
      continue;
    }
    value += character;
    index += 1;
  }
  throw new Error("unterminated quote");
}

export function shellSegments(command: string): string[][] {
  const segments: string[][] = [];
  let segment: string[] = [];
  for (const token of shellTokens(command)) {
    if (isSeparatorToken(token)) {
      if (segment.length > 0) {
        segments.push(segment);
        segment = [];
      }
    } else {
      segment.push(token);
    }
  }
  if (segment.length > 0) {
    segments.push(segment);
  }
  return segments;
}

export function shellPayload(arguments_: string[]): string | undefined {
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index] ?? "";
    const isCommandOption =
      argument === "-c" ||
      (argument.startsWith("-") &&
        !argument.startsWith("--") &&
        argument.slice(1).includes("c"));
    if (isCommandOption) {
      return arguments_[index + 1];
    }
  }
  return undefined;
}

export function stripLeadingShellPrefix(tokens: string[]): string[] {
  let index = 0;
  while (
    index < tokens.length &&
    (ASSIGNMENT.test(tokens[index] ?? "") || COMMAND_PREFIXES.has(tokens[index] ?? ""))
  ) {
    index += 1;
  }
  return tokens.slice(index);
}

function parenthesizedSubstitution(
  command: string,
  start: number,
): [string, number] | undefined {
  let depth = 1;
  let quote: string | undefined;
  let index = start;
  while (index < command.length) {
    const character = command[index] ?? "";
    if (quote === "'") {
      if (character === "'") {
        quote = undefined;
      }
      index += 1;
      continue;
    }
    if (quote === '"') {
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character === '"') {
        quote = undefined;
        index += 1;
        continue;
      }
      if (character === "$" && command[index + 1] === "(") {
        const nested = parenthesizedSubstitution(command, index + 2);
        if (nested === undefined) {
          return undefined;
        }
        index = nested[1];
        continue;
      }
      index += 1;
      continue;
    }
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      index += 1;
      continue;
    }
    if (character === "$" && command[index + 1] === "(") {
      const nested = parenthesizedSubstitution(command, index + 2);
      if (nested === undefined) {
        return undefined;
      }
      index = nested[1];
      continue;
    }
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return [command.slice(start, index), index + 1];
      }
    }
    index += 1;
  }
  return undefined;
}

export function commandSubstitutions(command: string): string[] {
  const substitutions: string[] = [];
  let quote: string | undefined;
  let index = 0;
  while (index < command.length) {
    const character = command[index] ?? "";
    if (quote === "'") {
      if (character === "'") {
        quote = undefined;
      }
      index += 1;
      continue;
    }
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "'") {
      if (quote === undefined) {
        quote = "'";
      }
      index += 1;
      continue;
    }
    if (character === '"') {
      quote = quote === '"' ? undefined : '"';
      index += 1;
      continue;
    }
    if (character === "$" && command[index + 1] === "(") {
      const extracted = parenthesizedSubstitution(command, index + 2);
      if (extracted === undefined) {
        index += 2;
        continue;
      }
      substitutions.push(extracted[0]);
      index = extracted[1];
      continue;
    }
    if (character === "`") {
      let end = index + 1;
      while (end < command.length) {
        if (command[end] === "\\") {
          end += 2;
          continue;
        }
        if (command[end] === "`") {
          substitutions.push(command.slice(index + 1, end));
          index = end + 1;
          break;
        }
        end += 1;
      }
      if (end >= command.length && command[end - 1] !== "`") {
        index += 1;
      }
      continue;
    }
    index += 1;
  }
  return substitutions;
}

export function afterOptions(
  arguments_: string[],
  optionsWithValues: ReadonlySet<string> = new Set(),
): string[] {
  let index = 0;
  while (index < arguments_.length) {
    const argument = arguments_[index] ?? "";
    if (argument === "--") {
      return arguments_.slice(index + 1);
    }
    if (!argument.startsWith("-") || argument === "-") {
      return arguments_.slice(index);
    }
    const option = argument.split("=", 1)[0] ?? argument;
    if (optionsWithValues.has(option) && !argument.includes("=")) {
      index += 2;
    } else {
      index += 1;
    }
  }
  return [];
}
