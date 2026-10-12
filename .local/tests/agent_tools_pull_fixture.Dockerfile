# Small native root for the real OCI/delta test, independent of the production image.
FROM ghcr.io/yusing/agentic-tools-container@sha256:70b59a6f5ad28a5429f9cd4fcdf16ac6347a143f7c3131c229e39d0bfe4fe83c AS fixture
COPY bwrap squashfuse zsync zsyncmake /runtime/
RUN set -eu; \
    mkdir -p /fixture/bin /fixture/usr/bin /fixture/opt/agent-tools/bin /fixture/etc /fixture/var/tmp /fixture/tmp /fixture/run /fixture/dev /fixture/proc /fixture/sys /out; \
    for command in /bin/sh /bin/bash /bin/true /bin/sleep /usr/bin/git /usr/bin/fusermount3; do \
      cp -L --parents "$command" /fixture; \
      ldd "$command" | awk '/=> \// {print $3} /^[[:space:]]*\// {print $1}' | while read -r library; do cp -L --parents "$library" /fixture; done; \
    done; \
    cp -L --parents /lib/*-linux-gnu/libm.so.6 /lib/*-linux-gnu/libpthread.so.0 /lib/*-linux-gnu/libdl.so.2 /fixture; \
    cp /runtime/bwrap /runtime/squashfuse /runtime/zsync /fixture/opt/agent-tools/bin/; \
    python3 -c 'import random; open("/fixture/padding", "wb").write(random.Random(0).randbytes(4 * 1024 * 1024))'; \
    printf 'old\n' > /fixture/revision; \
    mksquashfs /fixture /out/old.sqfs -noappend -comp zstd -Xcompression-level 3 -b 131072 -all-root -mkfs-time 0 -all-time 0 -processors 2; \
    printf 'new\n' > /fixture/revision; \
    python3 -c 'from pathlib import Path; p=Path("/fixture/padding"); data=bytearray(p.read_bytes()); data[::1048576]=bytes(value ^ 1 for value in data[::1048576]); p.write_bytes(data)'; \
    mksquashfs /fixture /out/new.sqfs -noappend -comp zstd -Xcompression-level 3 -b 131072 -all-root -mkfs-time 0 -all-time 0 -processors 2; \
    /runtime/zsyncmake -b 2048 -u tools.sqfs -o /out/new.sqfs.zsync /out/new.sqfs
FROM scratch
COPY --from=fixture /out/ /
