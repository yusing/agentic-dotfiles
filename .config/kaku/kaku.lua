local wezterm = require 'wezterm'

local function resolve_bundled_config()
  local resource_dir = wezterm.executable_dir:gsub('MacOS/?$', 'Resources')
  local bundled = resource_dir .. '/kaku.lua'
  local f = io.open(bundled, 'r')
  if f then
    f:close()
    return bundled
  end

  local dev_bundled = wezterm.executable_dir .. '/../../assets/macos/Kaku.app/Contents/Resources/kaku.lua'
  f = io.open(dev_bundled, 'r')
  if f then
    f:close()
    return dev_bundled
  end

  local app_bundled = '/Applications/Kaku.app/Contents/Resources/kaku.lua'
  f = io.open(app_bundled, 'r')
  if f then
    f:close()
    return app_bundled
  end

  local home = os.getenv('HOME') or ''
  local home_bundled = home .. '/Applications/Kaku.app/Contents/Resources/kaku.lua'
  f = io.open(home_bundled, 'r')
  if f then
    f:close()
    return home_bundled
  end

  return nil
end

-- Give bundled defaults a local font fallback without replacing their primary
-- fonts or theme-dependent rules. The proxy stays with their theme callbacks;
-- other consumers of the wezterm module are unchanged.
local bundled_environment = _G
if wezterm.target_triple:find('apple-darwin', 1, true) then
  local bundled_wezterm = setmetatable({
    font_with_fallback = function(fonts, defaults)
      local extended = {}
      for i, font in ipairs(fonts) do extended[i] = font end
      extended[#extended + 1] = 'JetBrainsMono Nerd Font Mono'
      return wezterm.font_with_fallback(extended, defaults)
    end,
  }, { __index = wezterm })
  bundled_environment = setmetatable({
    require = function(name)
      if name == 'wezterm' then return bundled_wezterm end
      return require(name)
    end,
  }, { __index = _G })
end

local config = {}
local bundled = resolve_bundled_config()

if bundled then
  local ok, loaded = pcall(function()
    return assert(loadfile(bundled, 't', bundled_environment))()
  end)
  if ok and type(loaded) == 'table' then
    config = loaded
  else
    wezterm.log_error('Kaku: failed to load bundled defaults from ' .. bundled)
  end
else
  wezterm.log_error('Kaku: bundled defaults not found')
end

-- Kaku follows macOS appearance by default. Uncomment one line to force a theme:
-- config.color_scheme = 'Kaku Dark'
-- config.color_scheme = 'Kaku Light'

-- User overrides:
-- Kaku intentionally keeps WezTerm-compatible Lua API names
-- for maximum compatibility, so `wezterm.*` here is expected.
-- Full API docs: https://wezfurlong.org/wezterm/config/lua/
-- Kaku options:  https://github.com/tw93/Kaku/blob/main/docs/configuration.md
--
-- Changes apply automatically when you save this file.
-- Every example below differs from the default, so uncommenting it takes effect.
--
-- 1) Font family and size (default: JetBrains Mono, size auto 15/17)
-- config.font = wezterm.font('Menlo')
-- config.font_size = 16.0
config.line_height = 1.1  -- default 1.28; use 1.0-1.1 if QR codes or TUI charts look stretched
--
-- 2) Color scheme (a fixed scheme disables light/dark auto switching)
-- config.color_scheme = 'Catppuccin Mocha'
--
-- 3) Window size and padding (default: 110x22, 40px sides, 0 bottom)
-- config.initial_cols = 120
-- config.initial_rows = 30
-- config.window_padding = { left = '24px', right = '24px', top = '40px', bottom = '20px' }
--
-- 4) Window transparency and blur
-- config.window_background_opacity = 0.95            -- opacity, 0.0 to 1.0
-- config.macos_window_background_blur = 20           -- blur radius, integer 0 to 100
--
-- 5) Selection and quit behavior
-- config.copy_on_select = false                      -- default true
-- config.window_close_confirmation = 'NeverPrompt'   -- default 'SmartPrompt'
--
-- 6) Default shell/program (default: your login shell)
-- config.default_prog = { '/opt/homebrew/bin/fish', '-l' }
--
-- 7) Cursor and scrollback
-- config.default_cursor_style = 'SteadyBlock'        -- default 'BlinkingBar'
-- config.cursor_blink_rate = 0                       -- 0 disables blinking; default 500
-- config.scrollback_lines = 20000                    -- default 10000
-- config.file_link_editor = 'zed'                    -- opens path[:line[:column]]
--
-- 8) Tab bar
-- config.tab_bar_at_bottom = false                   -- default true
-- config.hide_tab_bar_if_only_one_tab = false        -- default true
-- config.tab_title_show_basename_only = true
-- config.tab_title_show_foreground_process = true    -- show "dirname·codex" while commands run
--
-- 9) Tab key completion (default 'suggestion_first': Tab accepts the inline suggestion)
-- config.smart_tab_mode = 'completion_first'
--
-- 10) Working directory inheritance (default: all true)
-- config.window_inherit_working_directory = false
-- config.tab_inherit_working_directory = false
-- config.split_pane_inherit_working_directory = false
--
-- 11) Split pane
-- config.split_pane_gap = 6                          -- default 2
-- config.inactive_pane_hsb = { saturation = 1.0, brightness = 0.9 }
--
-- 12) Fullscreen (set false if you use yabai/AeroSpace tiling)
-- config.native_macos_fullscreen_mode = false
--
-- 13) Add a key binding (defaults: docs/keybindings.md)
-- table.insert(config.keys, {
--   key = 'k',
--   mods = 'CMD|SHIFT',
--   action = wezterm.action.ClearScrollback('ScrollbackAndViewport'),
-- })
--
-- AI assistant settings (provider, model, API key) live in
-- ~/.config/kaku/assistant.toml, not in this file.

return config
