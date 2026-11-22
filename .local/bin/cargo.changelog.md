# Changelog

## 1.1.1

Keep the wrapper's default target path out of compiler cache keys.

## 1.1.0

Seed new linked checkouts with reusable dependency artifacts from the primary checkout
and register their target caches for cleanup.

## 1.0.0

Use separate central target directories for Cargo workspace checkouts while
preserving explicit target settings and sharing compiler results through sccache.
