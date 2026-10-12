# Changelog

## Portable consumer compiler

Compile the host consumer with the checksummed upstream Bun executable matching
the installed Brew version. Brew's executable embeds its private loader and ICU
dependencies in compiled programs, which cannot bootstrap a Brew-free host.

## Bounded optional download-cache export

Limit download-cache extraction and upload time. A cache-service failure does
not block publication of a runtime that passed its consumer checks. Stream one
archive from BuildKit instead of transferring individual cache files.

## Loader cache build correction

Invoke the pinned base's loader-cache utility by absolute path after switching
from the builder's PATH to the root build stage.

## Download cache export correction

Use a run-specific export argument instead of --no-cache, which discards the
cache mount before extraction. Preserve downloads from failed installations.

## Shared language provisioning

Use the same setup-owned Brew Python/PyYAML and Brew rustup/WASI recipe on
macOS and in Linux images. Remove the separate image-only provisioning step.

## Pinned prerequisite base

Use the published immutable multi-architecture base in the tools, packaging and
OCI regression stages. Normal builds omit APT bootstrap installation.

## Prerequisite base publisher

Build an explicit multi-architecture Debian prerequisite image with SquashFS
packaging tools and en_US.UTF-8 for Homebrew post-installation.

## 0.1.2

Use Homebrew Python with an image-owned PyYAML 6.0.3 virtual environment on Linux.
Use Homebrew rustup with stable Rust and wasm32-wasip2. Preserve macOS Mise owners
and keep consumer Cargo downloads in the writable user home.

## Portable host Fish

Publish the checksummed standalone Fish 4.9.3 executable with each architecture's
raw files so image-only consumers can upgrade without losing their host shell.

## Setup 3.0.3

Move SwiftLint and mcdu to Brew, preserving mcdu’s upstream prebuilt-archive
install and upgrade path. Remove unused Bazelisk while keeping Brew Bazel.

## Brew system-tool migration

Use compatible Brew Chromium/WebKitGTK 4.1 libraries, unzip and xclip.
Use GNU netcat with the accepted command behavior. Exclude unused WebKitGTK 6.
Register the migrated browser library paths in the image loader cache.

## Linux client dependencies

Install OpenSSH for SSH-backed Git and the Docker client for existing host
daemons. Validate both clients and Homebrew through the mounted consumer runtime.

## CI cache correction

Store architecture-specific BuildKit layers in GHCR so large image layers do not
consume the Actions download-cache quota. Cache Bun, npm, Go modules, and helper
build inputs with the installation downloads. Trigger publication for all helper
source inputs and consumer regression tests.

## 0.1.1

Keep original installed command directories ahead of caller PATH entries. Retain
caller-only commands and invoke Homebrew from its own installation directory.

## Setup 3.0.2

Preserve the Linux host login shell when installing the managed tool image.

## Inventory and setup 3.0.1

Move 57 compatible Mise tools to Homebrew bottles. Keep exact former Mise
identities for managed-installation retirement. Preserve pinned tools and
required Python and Rust capabilities. Keep npm-backed tools on their npm source. Use Homebrew SwiftLint only on macOS.
Index setup queries directly instead of rescanning the full inventory per lookup.

## 0.1.0

Build the declared Linux inventory in Docker, create a normalized SquashFS
filesystem, and export raw runtime utilities and zsync update metadata.
Include FUSE control helpers for verification from managed login shells.
