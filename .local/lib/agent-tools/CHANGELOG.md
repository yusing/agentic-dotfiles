# Changelog

## 0.2.0

Pull raw OCI artifacts without extraction. Verify content identities, reuse
existing SquashFS blocks with zsync, and activate managed commands atomically.
Supply the runtime utilities from the artifact and preserve failed updates.
Preserve login-shell detection through native command links and allow pulls from
managed shells through a temporary mount-control namespace.

## 0.1.0

Run a trusted local SquashFS tool runtime without Docker or extraction. Preserve
host home and project paths, propagate command status, and clean up mounts.
