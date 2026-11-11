local wezterm = require 'wezterm'
local config = wezterm.config_builder()
local act = wezterm.action
local is_macos = wezterm.target_triple:find('apple-darwin', 1, true) ~= nil

-- Compatible defaults from tw93/Kaku at 3859669ad8e18459337b44970494e16cff6a832f.
-- https://github.com/tw93/Kaku/blob/3859669ad8e18459337b44970494e16cff6a832f/assets/macos/Kaku.app/Contents/Resources/kaku.lua
-- Standalone port: no Kaku installation or runtime state is required.
-- User overrides: line height 1.1, Nerd Font fallback, three zoom-out steps, native decorations.
-- Keep the terminal dark regardless of the desktop's reported appearance.
local scheme = 'Kaku Dark'
local is_light = scheme == 'Kaku Light'

local function font(weight, italic)
  local fonts = { { family = 'JetBrains Mono', weight = weight, italic = italic or false } }
  if is_macos then
    fonts[#fonts + 1] = { family = 'PingFang SC', weight = weight }
    fonts[#fonts + 1] = 'Apple Symbols'
    fonts[#fonts + 1] = 'Apple Color Emoji'
  end
  fonts[#fonts + 1] = 'JetBrainsMono Nerd Font Mono'
  return wezterm.font_with_fallback(fonts)
end
local base_weight = is_light and 'Medium' or 'Regular'
config.font = font(base_weight)
config.font_rules = {
  { intensity = 'Half', font = font(base_weight) },
  { intensity = 'Normal', italic = true, font = font(base_weight, false) },
  { intensity = 'Bold', font = font(is_light and 'DemiBold' or 'Medium') },
}

-- Do not call wezterm.gui.screens() while evaluating config: it can hang startup.
-- Current 2880x1620 display uses Kaku's 15-point, 26px-padding tier.
local low_resolution = true
local base_size = 15
-- Three zoom-out steps total: the original step plus two visual corrections.
-- Ctrl+0 restores this baseline without retaining a previous window zoom.
config.font_size = base_size / (1.1 ^ 3)
config.line_height = 1.1
config.cell_width = 1.0
config.harfbuzz_features = { 'calt=0', 'clig=0', 'liga=0' }
config.use_cap_height_to_scale_fallback_fonts = false
config.custom_block_glyphs = true
config.unicode_version = 14
config.bold_brightens_ansi_colors = false

local KAKU = {
  BLACK = '#15141b',
  WHITE = '#d5d4d6',
  GRAY = '#6d6d6d',
  PURPLE = '#8e6ad9',
  -- Use rgba() here because config::RgbaColor does not accept #RRGGBBAA.
  PURPLE_FADING = 'rgba(142,106,217,0.55)',
  SURFACE = '#1f1d28',
  SURFACE_ACTIVE = '#29263c',
  GREEN = '#58d8ad',
  ORANGE = '#daae76',
  PINK = '#d383da',
  BLUE = '#68afda',
  BRIGHT_BLUE = '#90c9e6',
  RED = '#d85d5d',
}

config.color_schemes = config.color_schemes or {}
config.color_schemes['Kaku Dark'] = {
  foreground = KAKU.WHITE,
  background = KAKU.BLACK,

  cursor_bg = KAKU.PURPLE,
  cursor_fg = KAKU.BLACK,
  cursor_border = KAKU.PURPLE,

  selection_bg = KAKU.PURPLE_FADING,
  selection_fg = KAKU.WHITE,

  ansi = {
    KAKU.BLACK, -- Keep ANSI black backgrounds dark without Kaku renderer remapping.
    KAKU.RED,     -- red
    KAKU.GREEN,   -- green
    KAKU.ORANGE,  -- yellow
    KAKU.BLUE,    -- blue
    KAKU.PURPLE,  -- magenta
    KAKU.GREEN,   -- cyan
    KAKU.WHITE,   -- white
  },

  brights = {
    KAKU.GRAY,    -- bright black
    KAKU.RED,     -- bright red
    KAKU.GREEN,   -- bright green
    KAKU.ORANGE,  -- bright yellow
    KAKU.BRIGHT_BLUE, -- bright blue
    KAKU.PURPLE,  -- bright magenta
    KAKU.GREEN,   -- bright cyan
    KAKU.WHITE,   -- bright white
  },

  split = KAKU.SURFACE_ACTIVE,

  tab_bar = {
    background = KAKU.BLACK,
    inactive_tab_edge = KAKU.BLACK,

    active_tab = {
      bg_color = KAKU.SURFACE_ACTIVE,
      fg_color = KAKU.WHITE,
      intensity = 'Bold',
      underline = 'None',
      italic = false,
      strikethrough = false,
    },

    inactive_tab = {
      bg_color = KAKU.BLACK,
      fg_color = KAKU.GRAY,
      intensity = 'Normal',
    },

    inactive_tab_hover = {
      bg_color = KAKU.SURFACE,
      fg_color = KAKU.WHITE,
      italic = false,
    },

    new_tab = {
      bg_color = KAKU.BLACK,
      fg_color = KAKU.GRAY,
    },

    new_tab_hover = {
      bg_color = KAKU.SURFACE,
      fg_color = KAKU.WHITE,
    },
  },


}

config.color_schemes['Kaku Light'] = {
  foreground = '#100F0F',
  background = '#FFFCF0',

  cursor_bg = '#343331',
  cursor_fg = '#FFFCF0',
  cursor_border = '#343331',

  selection_bg = '#E8E6DB',
  selection_fg = '#100F0F',

  ansi = {
    '#100F0F', -- black
    '#AF3029', -- red-600
    '#536907', -- green-700 (deepened for contrast)
    '#8E6B02', -- yellow-700 (deepened for contrast)
    '#205EA6', -- blue-600
    '#A02F6F', -- magenta-600
    '#1C6C66', -- cyan-700 (deepened for contrast)
    '#575653', -- base-700
  },

  brights = {
    '#6F6E69', -- base-600 (comments)
    '#C03E35', -- red-500
    '#66790D', -- green-600 (deepened for light-theme contrast ~5.3:1)
    '#8E6B02', -- yellow-700 (matches ansi yellow, contrast ~5.1:1)
    '#3171B2', -- blue-500
    '#B74583', -- magenta-500
    '#277C75', -- cyan-500 (deepened for light-theme contrast ~4.8:1)
    '#403E3C', -- base-800
  },

  scrollbar_thumb = '#C9C2B1',
  split = '#DDDBCF',

  tab_bar = {
    background = '#FFFCF0',
    inactive_tab_edge = '#FFFCF0',

    active_tab = {
      bg_color = '#E8E6DB',
      fg_color = '#100F0F',
      intensity = 'Bold',
      underline = 'None',
      italic = false,
      strikethrough = false,
    },

    inactive_tab = {
      bg_color = '#FFFCF0',
      fg_color = '#4A4946',
      intensity = 'Normal',
    },

    inactive_tab_hover = {
      bg_color = '#E8E6DB',
      fg_color = '#100F0F',
      italic = false,
    },

    new_tab = {
      bg_color = '#FFFCF0',
      fg_color = '#4A4946',
    },

    new_tab_hover = {
      bg_color = '#E8E6DB',
      fg_color = '#100F0F',
    },
  },


}

config.color_scheme = scheme
config.set_environment_variables = { COLORFGBG = is_light and '0;15' or '15;0' }
config.default_prog = { os.getenv('SHELL') or (is_macos and '/bin/zsh' or '/bin/sh'), '-l' }
config.default_cursor_style = 'BlinkingBar'
config.cursor_thickness = '2px'
config.cursor_blink_rate = 500
config.cursor_blink_ease_in = 'Constant'
config.cursor_blink_ease_out = 'Constant'
config.scrollback_lines = 10000
config.selection_word_boundary = ' \t\n{}[]()"\'-'
config.use_resize_increments = false
config.initial_cols = 110
config.initial_rows = 22
-- Use platform decorations, not Kaku's integrated buttons or custom frame.
config.window_decorations = 'TITLE|RESIZE'
config.window_background_opacity = 1.0
config.text_background_opacity = 1.0
config.text_min_contrast_ratio = 3.0
-- WezTerm has no SmartPrompt mode; retain its native close confirmation.
config.window_close_confirmation = 'AlwaysPrompt'
config.enable_tab_bar = true
config.tab_bar_at_bottom = true
config.use_fancy_tab_bar = false
config.tab_max_width = 48
config.hide_tab_bar_if_only_one_tab = true
config.show_tab_index_in_tab_bar = false
config.show_new_tab_button_in_tab_bar = false
local padding = low_resolution and '26px' or '40px'
config.window_padding = { left = padding, right = padding, top = padding, bottom = '0px' }
config.send_composed_key_when_left_alt_is_pressed = false
config.send_composed_key_when_right_alt_is_pressed = true
config.native_macos_fullscreen_mode = true
config.quit_when_all_windows_are_closed = false
config.enable_scroll_bar = false
config.front_end = 'WebGpu'
config.webgpu_power_preference = 'LowPower'
config.animation_fps = 60
config.max_fps = 60
config.status_update_interval = 1000
config.inactive_pane_hsb = { saturation = 1.0, brightness = 1.0 }
config.swallow_mouse_click_on_pane_focus = true
config.swallow_mouse_click_on_window_focus = true

-- Keep native WezTerm bindings alongside Kaku's compatible Cmd shortcuts.
config.keys = {
  { key = 'k', mods = 'CMD', action = act.Multiple { act.SendKey { key = 'l', mods = 'CTRL' }, act.ClearScrollback 'ScrollbackAndViewport' } },
  { key = 'r', mods = 'CMD', action = act.Multiple { act.SendKey { key = 'l', mods = 'CTRL' }, act.ClearScrollback 'ScrollbackAndViewport' } },
  { key = 'q', mods = 'CMD', action = act.QuitApplication },
  { key = 'n', mods = 'CMD', action = act.SpawnWindow },
  { key = 'w', mods = 'CMD', action = act.CloseCurrentPane { confirm = true } },
  { key = 'w', mods = 'CMD|SHIFT', action = act.CloseCurrentTab { confirm = true } },
  { key = 't', mods = 'CMD', action = act.SpawnTab 'CurrentPaneDomain' },
  { key = 'f', mods = 'CMD|CTRL', action = act.ToggleFullScreen },
  { key = 'm', mods = 'CMD', action = act.Hide },
  { key = 'h', mods = 'CMD', action = act.HideApplication },
  { key = 'LeftArrow', mods = 'ALT', action = act.SendKey { key = 'b', mods = 'ALT' } },
  { key = 'RightArrow', mods = 'ALT', action = act.SendKey { key = 'f', mods = 'ALT' } },
  { key = 'LeftArrow', mods = 'CMD', action = act.SendKey { key = 'a', mods = 'CTRL' } },
  { key = 'RightArrow', mods = 'CMD', action = act.SendKey { key = 'e', mods = 'CTRL' } },
  { key = 'Backspace', mods = 'CMD', action = act.SendKey { key = 'u', mods = 'CTRL' } },
  { key = 'Backspace', mods = 'ALT', action = act.SendKey { key = 'w', mods = 'CTRL' } },
  { key = 'd', mods = 'CMD', action = act.SplitHorizontal { domain = 'CurrentPaneDomain' } },
  { key = 'D', mods = 'CMD|SHIFT', action = act.SplitVertical { domain = 'CurrentPaneDomain' } },
  { key = '[', mods = 'CMD|SHIFT', action = act.ActivateTabRelative(-1) },
  { key = ']', mods = 'CMD|SHIFT', action = act.ActivateTabRelative(1) },
  { key = 'Enter', mods = 'CMD', action = act.SendString '\n' },
  { key = 'Enter', mods = 'SHIFT', action = act.SendString '\n' },
  { key = 'Enter', mods = 'CMD|SHIFT', action = act.TogglePaneZoomState },
}
for _, mods in ipairs { 'CMD', 'CTRL' } do
  for key, action in pairs { ['-'] = act.DecreaseFontSize, ['='] = act.IncreaseFontSize, ['0'] = act.ResetFontSize } do
    table.insert(config.keys, { key = key, mods = mods, action = action })
  end
end
for i = 1, 9 do
  table.insert(config.keys, { key = tostring(i), mods = 'CMD', action = act.ActivateTab(i - 1) })
end
for _, direction in ipairs { 'Left', 'Right', 'Up', 'Down' } do
  table.insert(config.keys, { key = direction .. 'Arrow', mods = 'CMD|ALT', action = act.ActivatePaneDirection(direction) })
  table.insert(config.keys, { key = direction .. 'Arrow', mods = 'CMD|CTRL', action = act.AdjustPaneSize { direction, 5 } })
end
config.mouse_bindings = {
  { event = { Up = { streak = 1, button = 'Left' } }, mods = 'NONE', action = act.CompleteSelection 'ClipboardAndPrimarySelection' },
  { event = { Up = { streak = 1, button = 'Left' } }, mods = 'CMD', action = act.OpenLinkAtMouseCursor },
}

-- Kaku-only renderer color remapping, pane gaps, smart Tab,
-- AI/tool overlays, remembered sessions/CWD, and native UI behavior are not ported.
return config
