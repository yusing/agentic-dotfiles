# Shared multiline normalization for gen_* prompt strings (via Python).

function _gen_normalize_prompt -a text
    set -l script "$__fish_config_dir/scripts/normalize_prompt.py"
    if not test -f "$script"
        echo "_gen_normalize_prompt: missing $script" >&2
        return 1
    end
    printf '%s' "$text" | command python3 "$script"
end
