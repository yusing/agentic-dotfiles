# syntax=docker/dockerfile:1
FROM alpine:3.24.2 AS runtime-build
RUN apk add --no-cache build-base curl tar xz meson ninja pkgconf go \
    libcap-dev libcap-static fuse3-dev fuse3-static zstd-dev zstd-static zlib-dev zlib-static
WORKDIR /build
RUN curl -fsSL https://github.com/containers/bubblewrap/releases/download/v0.13.0/bubblewrap-0.13.0.tar.xz -o bwrap.tar.xz \
    && echo '4734237473c0e5d695e4e9034a34e43b2dbf5164655bd13fa59ae376b2b7a765  bwrap.tar.xz' | sha256sum -c - \
    && tar -xf bwrap.tar.xz \
    && meson setup bubblewrap-0.13.0/build bubblewrap-0.13.0 -Ddefault_library=static -Dprefer_static=true -Dc_link_args=-static -Dselinux=disabled -Dman=disabled -Dtests=false \
    && ninja -C bubblewrap-0.13.0/build \
    && mkdir /out && cp bubblewrap-0.13.0/build/bwrap /out/bwrap
RUN curl -fsSL https://github.com/vasi/squashfuse/releases/download/0.6.3/squashfuse-0.6.3.tar.gz -o squashfuse.tar.gz \
    && echo '0c9f582ca488dc5eb450830d72f45a042ef5c0476118502ab5ed86ae9dd8bd46  squashfuse.tar.gz' | sha256sum -c - \
    && tar -xf squashfuse.tar.gz \
    && cd squashfuse-0.6.3 \
    && LDFLAGS=-static ./configure --disable-shared --enable-static --without-xz --without-lzo --without-lz4 \
    && make -j2 LDFLAGS=-all-static && cp squashfuse /out/squashfuse
RUN curl -fsSL https://zsync.moria.org.uk/download/zsync-0.8.0.tar.gz -o zsync.tar.gz \
    && echo '58b02f27e14326b62b7fdd6ed431a3e243b1c5a3ea9e3c1678e136dbf00c238d  zsync.tar.gz' | sha256sum -c - \
    && tar -xf zsync.tar.gz && cd zsync-0.8.0 \
    && CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/zsync ./cmd/zsync \
    && CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/zsyncmake ./cmd/zsyncmake
RUN for binary in /out/*; do echo "checking static executable: $binary"; ! readelf -l "$binary" | grep -q INTERP || exit 1; done

FROM scratch AS runtime-export
COPY --from=runtime-build /out/ /

FROM debian:trixie-slim AS tools
ENV HOME=/opt/agent-home SETUP_IMAGE_BUILD=1 DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends sudo curl ca-certificates git python3 build-essential procps file zlib1g-dev fuse3 \
    && useradd -m -d /opt/agent-home builder \
    && echo 'builder ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/builder \
    && chmod 440 /etc/sudoers.d/builder
WORKDIR /opt/agent-home
COPY --chown=builder:builder setup.sh setup.json ./
COPY --chown=builder:builder .config/mise/ .config/mise/
USER builder
ARG REFRESH=0
ARG UPGRADE_EPOCH=locked
RUN --mount=type=secret,id=github_token,uid=1000 \
    --mount=type=cache,target=/opt/agent-home/.cache,uid=1000,gid=1000 \
    echo "tool refresh: $UPGRADE_EPOCH" \
    && if [ -f /run/secrets/github_token ]; then export GITHUB_TOKEN="$(cat /run/secrets/github_token)"; fi \
    && python3 -c 'import json; plan=json.load(open("setup.json")); plan["vendors"]={}; json.dump(plan,open("/tmp/tool-inventory.json","w"))' \
    && if [ "$REFRESH" = 1 ]; then bash setup.sh --config /tmp/tool-inventory.json --upgrade; else bash setup.sh --config /tmp/tool-inventory.json; fi \
    && rm /tmp/tool-inventory.json
RUN --mount=type=secret,id=github_token,uid=1000 \
    --mount=type=cache,target=/opt/agent-home/.cache,uid=1000,gid=1000 \
    if [ -f /run/secrets/github_token ]; then export GITHUB_TOKEN="$(cat /run/secrets/github_token)"; fi \
    && LDFLAGS=-L/home/linuxbrew/.linuxbrew/opt/openssl@3/lib bash setup.sh
ENV PATH=/opt/agent-home/.local/share/mise/shims:/opt/agent-home/.local/bin:/home/linuxbrew/.linuxbrew/bin:/usr/local/bin:/usr/bin:/bin
COPY --chown=builder:builder .local/bin/compile-agent-tools .local/bin/compile-agent-tools
COPY --chown=builder:builder .local/lib/ .local/lib/
COPY --chown=builder:builder .codex/hooks/ .codex/hooks/
COPY --chown=builder:builder .grok/hooks/ .grok/hooks/
RUN sudo install -d -o builder -g builder /opt/agent-tools \
    && .local/bin/compile-agent-tools \
    && bun build --compile --outfile=/tmp/finalize .local/lib/tool-image/finalize.ts \
    && /tmp/finalize && rm /tmp/finalize
USER root
RUN rm -rf /var/lib/apt/lists/* /opt/agent-home/.cache /opt/agent-home/.local/state \
    /opt/agent-home/go/pkg \
    && rm -f /etc/sudoers.d/builder
ENV AGENT_TOOLS_RUNTIME=1
ENTRYPOINT ["/opt/agent-tools/enter"]
CMD ["bash"]

FROM debian:trixie-slim AS pack
RUN apt-get update && apt-get install -y --no-install-recommends squashfs-tools \
    && rm -rf /var/lib/apt/lists/*
COPY --from=runtime-build /out/ /out/
RUN --mount=from=tools,source=/,target=/rootfs,ro \
    cp /rootfs/opt/agent-tools/commands.json /out/commands.json \
    && cp /rootfs/opt/agent-home/.local/bin/agent-tools /out/agent-tools \
    && for owner in codex grok; do for file in /rootfs/opt/agent-home/.$owner/hooks/bin/*; do \
         [ ! -f "$file" ] || cp "$file" "/out/hook-$owner-$(basename "$file")"; done; done \
    && for file in /rootfs/usr/lib/*-linux-gnu/libc.so.6 /rootfs/usr/lib/*-linux-gnu/libm.so.6 /rootfs/usr/lib/*-linux-gnu/ld-linux-*.so.*; do \
         cp "$file" "/out/hostlib-$(basename "$file")"; done \
    && mksquashfs /rootfs /out/tools.sqfs -noappend -comp zstd -Xcompression-level 3 -b 131072 -all-root -mkfs-time 0 -all-time 0 -processors 2 \
    && /out/zsyncmake -b 2048 -u tools.sqfs -o /out/tools.sqfs.zsync /out/tools.sqfs

FROM scratch AS export
COPY --from=pack /out/ /
