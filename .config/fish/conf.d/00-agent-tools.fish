if test "$AGENT_TOOLS_RUNTIME" != 1; and test -x $HOME/.local/share/agent-tools/current/agent-tools
    # Replay the original invocation before any startup command runs.
    set -l runtime_argv
    while read --null -l argument
        set -a runtime_argv "$argument"
    end </proc/$fish_pid/cmdline
    if status is-login
        set runtime_argv $runtime_argv[1] --login $runtime_argv[2..]
    end
    exec $HOME/.local/bin/agent-tools run -- fish $runtime_argv[2..]
end
