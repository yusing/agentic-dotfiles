#!/usr/bin/env python3
"""Inject the skills-mgr inventory under a heading that marks it as injected.

`skills-mgr list` scopes itself to the calling harness from the session
environment, so this hook is shared as-is by every harness that runs it.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

HEADING = "--- skills-mgr injected ---"
SKILL_TO_HIDE = "use-modern-go"


def filtered_inventory(body: str) -> str:
    """Remove the superseded injected skill while retaining inventory metadata."""
    parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True, insert_pis=True))
    root = ET.fromstring(body, parser=parser)
    for parent in root.iter():
        for child in list(parent):
            if child.tag == "skill" and child.get("name") == SKILL_TO_HIDE:
                parent.remove(child)
    return ET.tostring(root, encoding="unicode")


def main() -> int:
    executable = shutil.which("skills-mgr")
    if executable is None:
        sys.stderr.write("skills-mgr inventory unavailable: skills-mgr is not on PATH\n")
        return 127
    result = subprocess.run(
        [executable, "list"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.stderr:
        sys.stderr.write(result.stderr)
    body = result.stdout
    if body.strip():
        try:
            body = filtered_inventory(body)
        except ET.ParseError as error:
            sys.stderr.write(f"skills-mgr returned invalid inventory XML: {error}\n")
            return result.returncode or 1
        sys.stdout.write(f"{HEADING}\n{body}")
        if not body.endswith("\n"):
            sys.stdout.write("\n")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
