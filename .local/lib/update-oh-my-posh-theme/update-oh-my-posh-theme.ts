#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const VERSION = "1.0.0";
const THEME_URL = "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/catppuccin_macchiato.omp.json";

export async function updateTheme(
	themePath: string,
	cacheDir: string,
	day: string,
	download: () => Promise<string>,
): Promise<"skipped" | "unchanged" | "updated"> {
	await mkdir(cacheDir, { recursive: true });
	try {
		await (await open(join(cacheDir, `${day}.checked`), "wx")).close();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") return "skipped";
		throw error;
	}
	for (const name of await readdir(cacheDir)) {
		if (/^\d{4}-\d{2}-\d{2}\.checked$/.test(name) && name < `${day}.checked`) {
			await unlink(join(cacheDir, name));
		}
	}
	const content = await download();
	const theme = JSON.parse(content);
	if (!Array.isArray(theme.blocks) || theme.blocks.length === 0 || !Number.isInteger(theme.version)) {
		throw new Error("downloaded theme is not an Oh My Posh configuration");
	}
	if (content === await readFile(themePath, "utf8")) return "unchanged";
	const temporary = `${themePath}.update-${randomUUID()}`;
	try {
		await writeFile(temporary, content, { flag: "wx", mode: 0o644 });
		await rename(temporary, themePath);
	} finally {
		await unlink(temporary).catch(error => {
			if (error.code !== "ENOENT") throw error;
		});
	}
	return "updated";
}

if (import.meta.main) {
	if (process.argv[2] === "--version") {
		console.log(VERSION);
	} else {
		const now = new Date();
		const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		try {
			await updateTheme(
				join(homedir(), ".config/oh-my-posh/catppuccin_macchiato.omp.json"),
				join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "oh-my-posh/theme-updates"),
				day,
				async () => {
					const response = await fetch(THEME_URL, { signal: AbortSignal.timeout(10_000) });
					if (!response.ok) throw new Error(`theme download failed: HTTP ${response.status}`);
					return response.text();
				},
			);
		} catch (error) {
			console.error(`update-oh-my-posh-theme: ${(error as Error).message}`);
			process.exitCode = 1;
		}
	}
}
