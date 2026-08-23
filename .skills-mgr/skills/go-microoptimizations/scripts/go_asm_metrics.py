#!/usr/bin/env python3
"""Compile a Go package, objdump selected amd64 symbols, and report asm metrics."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path


CONDITIONAL_BRANCHES = {
    "JA",
    "JAE",
    "JB",
    "JBE",
    "JC",
    "JCC",
    "JCS",
    "JE",
    "JEQ",
    "JG",
    "JGE",
    "JGT",
    "JH",
    "JHI",
    "JL",
    "JLE",
    "JLO",
    "JLS",
    "JLT",
    "JMI",
    "JNA",
    "JNAE",
    "JNB",
    "JNBE",
    "JNE",
    "JNG",
    "JNGE",
    "JNL",
    "JNLE",
    "JNO",
    "JNP",
    "JNS",
    "JNZ",
    "JO",
    "JP",
    "JPC",
    "JPL",
    "JPS",
    "JS",
    "JZ",
}
STACK_MNEMONICS = {"PUSH", "PUSHL", "PUSHQ", "POP", "POPL", "POPQ"}
SP_ADJUST = {"ADDL", "ADDQ", "SUBL", "SUBQ"}
PC_RE = re.compile(r"0x[0-9a-fA-F]+")
MNEMONIC_RE = re.compile(r"[A-Z][A-Z0-9.]*")
TEXT_RE = re.compile(r"^TEXT\s+(.+?)\(SB\)")
STACK_REF_RE = re.compile(r"[-+0-9xa-fA-F()]*\b(SP|BP)\b")
SP_RE = re.compile(r"\bSP\b")


@dataclass
class Instruction:
    source: str
    pc: str
    mnemonic: str
    operands: str


@dataclass
class SymbolMetrics:
    symbol: str
    instruction_count: int
    branch_count: int
    unconditional_jump_count: int
    cmov_count: int
    stack_churn_detected: bool
    stack_op_count: int


def run_process(cmd: list[str], cwd: Path, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        stderr=subprocess.STDOUT,
        stdout=subprocess.PIPE,
        text=True,
        check=False,
    )
    return completed


def run(cmd: list[str], cwd: Path, env: dict[str, str]) -> str:
    completed = run_process(cmd, cwd, env)
    if completed.returncode != 0:
        sys.stderr.write(completed.stdout)
        raise SystemExit(completed.returncode)
    return completed.stdout


def try_run(cmd: list[str], cwd: Path, env: dict[str, str]) -> tuple[int, str]:
    completed = run_process(cmd, cwd, env)
    return completed.returncode, completed.stdout


def compile_package_artifact(pkg_dir: Path, output: Path, env: dict[str, str]) -> Path:
    failures: list[str] = []
    for cmd in (
        ["go", "test", "-c", "-o", str(output)],
        ["go", "build", "-o", str(output)],
    ):
        code, cmd_output = try_run(cmd, pkg_dir, env)
        if code == 0 and output.is_file():
            return output
        failures.append(cmd_output)

    code, cmd_output = try_run(["go", "list", "-export", "-f", "{{.Export}}", "."], pkg_dir, env)
    export_path = cmd_output.strip()
    if code != 0:
        failures.append(cmd_output)
        sys.stderr.write("".join(failures))
        raise SystemExit(code)
    if export_path:
        return Path(export_path)

    sys.stderr.write("".join(failures))
    raise SystemExit(1)


def objdump(binary: Path, symbol: str, cwd: Path, env: dict[str, str]) -> str:
    return run(["go", "tool", "objdump", "-s", symbol, str(binary)], cwd, env)


def parse_instruction(line: str) -> Instruction | None:
    parts = line.strip().split()
    if len(parts) < 4:
        return None

    pc_index = next((i for i, part in enumerate(parts) if PC_RE.fullmatch(part)), None)
    if pc_index is None:
        return None

    for i in range(pc_index + 1, len(parts)):
        if MNEMONIC_RE.fullmatch(parts[i]):
            source = " ".join(parts[:pc_index])
            return Instruction(
                source=source,
                pc=parts[pc_index],
                mnemonic=parts[i],
                operands=" ".join(parts[i + 1 :]),
            )
    return None


def parse_symbols(dump: str) -> dict[str, list[Instruction]]:
    symbols: dict[str, list[Instruction]] = {}
    current = ""

    for line in dump.splitlines():
        text_match = TEXT_RE.match(line)
        if text_match:
            current = text_match.group(1)
            symbols.setdefault(current, [])
            continue

        instruction = parse_instruction(line)
        if instruction and current:
            symbols[current].append(instruction)

    return symbols


def stack_churn(instruction: Instruction) -> bool:
    mnemonic = instruction.mnemonic
    operands = instruction.operands
    if mnemonic in STACK_MNEMONICS:
        return True
    if mnemonic in SP_ADJUST and SP_RE.search(operands):
        return True
    return bool(STACK_REF_RE.search(operands))


def metrics_for(symbol: str, instructions: list[Instruction]) -> SymbolMetrics:
    branch_count = sum(1 for inst in instructions if inst.mnemonic in CONDITIONAL_BRANCHES)
    unconditional_jump_count = sum(1 for inst in instructions if inst.mnemonic == "JMP")
    cmov_count = sum(1 for inst in instructions if inst.mnemonic.startswith("CMOV"))
    stack_op_count = sum(1 for inst in instructions if stack_churn(inst))

    return SymbolMetrics(
        symbol=symbol,
        instruction_count=len(instructions),
        branch_count=branch_count,
        unconditional_jump_count=unconditional_jump_count,
        cmov_count=cmov_count,
        stack_churn_detected=stack_op_count > 0,
        stack_op_count=stack_op_count,
    )


def load_baseline(path: Path | None) -> dict[str, SymbolMetrics]:
    if not path:
        return {}

    raw = json.loads(path.read_text())
    return {
        item["symbol"]: SymbolMetrics(
            symbol=item["symbol"],
            instruction_count=item["instruction_count"],
            branch_count=item["branch_count"],
            unconditional_jump_count=item["unconditional_jump_count"],
            cmov_count=item["cmov_count"],
            stack_churn_detected=item["stack_churn_detected"],
            stack_op_count=item["stack_op_count"],
        )
        for item in raw["symbols"]
    }


def print_report(metrics: list[SymbolMetrics], baseline: dict[str, SymbolMetrics]) -> None:
    for item in metrics:
        print(item.symbol)
        print(f"  instruction_count: {item.instruction_count}")
        print(f"  branch_count: {item.branch_count}")
        print(f"  unconditional_jump_count: {item.unconditional_jump_count}")
        print(f"  cmov_count: {item.cmov_count}")
        print(f"  stack_churn_detected: {str(item.stack_churn_detected).lower()}")
        print(f"  stack_op_count: {item.stack_op_count}")

        previous = baseline.get(item.symbol)
        if previous:
            print(f"  delta_instruction_count: {item.instruction_count - previous.instruction_count:+d}")
            print(f"  delta_branch_count: {item.branch_count - previous.branch_count:+d}")
            print(f"  delta_stack_op_count: {item.stack_op_count - previous.stack_op_count:+d}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", help="Go package directory to compile with go test -c")
    parser.add_argument("--symbol", action="append", default=[], help="exact symbol name to inspect")
    parser.add_argument("--symbol-regex", action="append", default=[], help="regexp passed to go tool objdump -s")
    parser.add_argument("--json-output", type=Path, help="write metrics JSON to this path")
    parser.add_argument("--baseline", type=Path, help="metrics JSON from an earlier run")
    parser.add_argument("--goos", help="GOOS override")
    parser.add_argument("--goarch", help="GOARCH override")
    parser.add_argument("--keep-binary", type=Path, help="write compiled test binary here")
    args = parser.parse_args()
    if not args.symbol and not args.symbol_regex:
        parser.error("at least one --symbol or --symbol-regex is required")
    return args


def combined_symbol_pattern(symbols: list[str], regexes: list[str]) -> str:
    escaped_symbols = [f"^{re.escape(symbol)}$" for symbol in symbols]
    grouped_regexes = [f"(?:{regex})" for regex in regexes]
    return "|".join([*escaped_symbols, *grouped_regexes])


def host_tool_env(env: dict[str, str]) -> dict[str, str]:
    tool_env = env.copy()
    tool_env.pop("GOOS", None)
    tool_env.pop("GOARCH", None)
    return tool_env


def effective_go_env(pkg_dir: Path, env: dict[str, str]) -> dict[str, str]:
    raw = run(["go", "env", "-json", "GOOS", "GOARCH"], pkg_dir, env)
    values = json.loads(raw)
    if values["GOARCH"] != "amd64":
        sys.stderr.write(f"unsupported GOARCH {values['GOARCH']!r}; amd64 metrics only\n")
        raise SystemExit(2)
    return values


def main() -> int:
    args = parse_args()
    pkg_dir = Path(args.package).resolve()
    env = os.environ.copy()
    if args.goos:
        env["GOOS"] = args.goos
    if args.goarch:
        env["GOARCH"] = args.goarch

    baseline = load_baseline(args.baseline)
    target = effective_go_env(pkg_dir, env)
    tool_env = host_tool_env(env)

    with tempfile.TemporaryDirectory(prefix="go-asm-metrics-") as tmp:
        binary = args.keep_binary or Path(tmp) / "package.test"
        artifact = compile_package_artifact(pkg_dir, binary, env)

        all_metrics: list[SymbolMetrics] = []
        seen: set[str] = set()
        symbols = parse_symbols(objdump(artifact, combined_symbol_pattern(args.symbol, args.symbol_regex), pkg_dir, tool_env))
        for name, instructions in symbols.items():
            if name in seen:
                continue
            seen.add(name)
            all_metrics.append(metrics_for(name, instructions))

    if not all_metrics:
        sys.stderr.write("no matching symbols found in objdump output\n")
        return 2

    print_report(all_metrics, baseline)

    if args.json_output:
        payload = {
            "go_version": run(["go", "version"], pkg_dir, tool_env).strip(),
            "goos": target["GOOS"],
            "goarch": target["GOARCH"],
            "package": str(pkg_dir),
            "symbols": [asdict(item) for item in all_metrics],
        }
        args.json_output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
