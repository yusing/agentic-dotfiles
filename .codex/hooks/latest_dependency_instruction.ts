import * as path from "path";
import { deny } from "./lib/hook_response.ts";
import { handleVersion, isRecord, readEvent, runMain, writeJson } from "./lib/hook_runtime.ts";
import {
  SHELLS,
  shellPayload,
  shellSegments,
  stripLeadingShellPrefix,
} from "./lib/shell_command.ts";

export const VERSION = "1.0.1";

const PYTHON_EXECUTABLE = /^(?:python|python\d+(?:\.\d+)?)$/;
const PYTHON_CONSTRAINT = /(?:===|==|~=|!=|<=|>=|<|>)/;
export const INSTRUCTION =
  "Dependency addition blocked because the command supplied an explicit version. " +
  "Do not use a package version recalled from model memory. Query the authoritative " +
  "package registry or package-manager metadata now, select the latest stable release " +
  "compatible with explicit project and runtime constraints, and retry with an " +
  "unversioned package specifier so the package manager resolves the current release. " +
  "If the user or project explicitly requires an older version, explain that constraint " +
  "instead of bypassing this guard.";

function positionals(arguments_: string[]): string[] {
  return arguments_.filter((argument) => !argument.startsWith("-"));
}

function javascriptSpecHasVersion(spec: string): boolean {
  if (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.startsWith("file:") ||
    spec.startsWith("git:") ||
    spec.startsWith("git+") ||
    spec.startsWith("http:") ||
    spec.startsWith("https:")
  ) {
    return false;
  }
  const separator = spec.lastIndexOf("@");
  if (separator <= 0) {
    return false;
  }
  const version = spec.slice(separator + 1).toLowerCase();
  return !["", "*", "latest", "workspace:*", "workspace:^", "workspace:~"].includes(version);
}

function pythonSpecHasVersion(spec: string): boolean {
  if (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.startsWith("file:") ||
    spec.startsWith("git+") ||
    spec.startsWith("http:") ||
    spec.startsWith("https:")
  ) {
    return false;
  }
  return PYTHON_CONSTRAINT.test(spec);
}

function explicitVersion(executable: string, arguments_: string[]): boolean {
  if (["npm", "pnpm", "bun"].includes(executable)) {
    if (arguments_.length === 0 || !["add", "i", "install"].includes(arguments_[0] ?? "")) {
      return false;
    }
    return positionals(arguments_.slice(1)).some(javascriptSpecHasVersion);
  }
  if (executable === "yarn") {
    return (arguments_[0] === "add") && positionals(arguments_.slice(1)).some(javascriptSpecHasVersion);
  }
  if (executable === "deno") {
    return (arguments_[0] === "add") && positionals(arguments_.slice(1)).some(javascriptSpecHasVersion);
  }
  if (executable === "pip" || executable === "pip3") {
    return (arguments_[0] === "install") && positionals(arguments_.slice(1)).some(pythonSpecHasVersion);
  }
  if (PYTHON_EXECUTABLE.test(executable)) {
    return (
      arguments_.length >= 2 &&
      arguments_[0] === "-m" &&
      arguments_[1] === "pip" &&
      explicitVersion("pip", arguments_.slice(2))
    );
  }
  if (executable === "uv") {
    let specs: string[];
    if (arguments_[0] === "pip" && arguments_[1] === "install") {
      specs = arguments_.slice(2);
    } else if (arguments_[0] === "add") {
      specs = arguments_.slice(1);
    } else {
      return false;
    }
    return positionals(specs).some(pythonSpecHasVersion);
  }
  if (executable === "poetry") {
    return (
      arguments_[0] === "add" &&
      positionals(arguments_.slice(1)).some(
        (spec) => javascriptSpecHasVersion(spec) || pythonSpecHasVersion(spec),
      )
    );
  }
  if (executable === "pipenv") {
    return (arguments_[0] === "install") && positionals(arguments_.slice(1)).some(pythonSpecHasVersion);
  }
  if (executable === "cargo") {
    return (
      arguments_[0] === "add" &&
      (arguments_.slice(1).some(
        (argument) =>
          argument === "--vers" ||
          argument === "--version" ||
          argument.startsWith("--vers=") ||
          argument.startsWith("--version="),
      ) ||
        positionals(arguments_.slice(1)).some(javascriptSpecHasVersion))
    );
  }
  if (executable === "go") {
    return (
      (arguments_[0] === "get" || arguments_[0] === "install") &&
      positionals(arguments_.slice(1)).some(javascriptSpecHasVersion)
    );
  }
  if (executable === "composer") {
    return (
      arguments_[0] === "require" &&
      positionals(arguments_.slice(1)).some(
        (spec) => javascriptSpecHasVersion(spec) || /(?::|\^|~|[<>=])\d/.test(spec),
      )
    );
  }
  if (executable === "bundle" || executable === "gem") {
    const subcommand = executable === "bundle" ? "add" : "install";
    return (
      arguments_[0] === subcommand &&
      (arguments_.slice(1).some(
        (argument) => argument === "-v" || argument === "--version" || argument.startsWith("--version="),
      ) ||
        positionals(arguments_.slice(1)).some(
          (spec) => javascriptSpecHasVersion(spec) || /(?:\^|~|[<>=])\d/.test(spec),
        ))
    );
  }
  if (executable === "dotnet") {
    return (
      arguments_[0] === "add" &&
      arguments_[1] === "package" &&
      arguments_.slice(2).some((argument) => argument === "--version" || argument.startsWith("--version="))
    );
  }
  if (executable === "luarocks" && arguments_[0] === "install") {
    return positionals(arguments_.slice(1)).length > 1;
  }
  return false;
}

function segmentHasExplicitDependencyVersion(tokens: string[], depth: number): boolean {
  const remaining = stripLeadingShellPrefix(tokens);
  if (remaining.length === 0) {
    return false;
  }
  const executable = path.basename(remaining[0] ?? "");
  const arguments_ = remaining.slice(1);
  if (executable === "rtk") {
    return segmentHasExplicitDependencyVersion(arguments_, depth);
  }
  if (SHELLS.has(executable)) {
    const payload = shellPayload(arguments_);
    return payload !== undefined && hasExplicitDependencyVersion(payload, depth + 1);
  }
  return explicitVersion(executable, arguments_);
}

export function hasExplicitDependencyVersion(command: unknown, depth = 0): boolean {
  if (typeof command !== "string" || command.trim().length === 0 || depth > 4) {
    return false;
  }
  return shellSegments(command).some((segment) =>
    segmentHasExplicitDependencyVersion(segment, depth),
  );
}

export function responseFor(event: unknown): Record<string, unknown> | undefined {
  if (!isRecord(event)) {
    return undefined;
  }
  const toolInput = event.tool_input;
  if (!isRecord(toolInput)) {
    return undefined;
  }
  if (!hasExplicitDependencyVersion(toolInput.command)) {
    return undefined;
  }
  return deny(INSTRUCTION);
}

function main(): number {
  if (handleVersion(VERSION)) {
    return 0;
  }
  const response = responseFor(readEvent());
  if (response !== undefined) {
    writeJson(response);
  }
  return 0;
}

runMain("latest_dependency_instruction", main);
