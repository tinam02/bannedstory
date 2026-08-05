-- dumps UI.wz chat balloons and name tags as packed sprite strips
--
-- run it from the LuaConsole plugin in WzComparerR2, with Base.wz loaded
-- (opening Base.wz pulls in its sibling wz files, so UI.wz comes along)
--
-- a balloon is a 9-slice, nw/n/ne over w/c/e over sw/s/se, plus an arrow tail.
-- n is the same width as c and w is the same height as c, so c is the tile unit
-- and the box grows to fit whatever the user types
--
-- rather than 4600 tiny piece files, each style becomes one strip png with the
-- piece rects in the manifest. animated styles get one row per frame

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'WzComparerR2.Encoders'
import 'System.IO'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

------------------------------------------------------------

local OUT_ROOT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\public\\ui'

-- true reports the structure and writes nothing
local SCREEN_ONLY = false

-- empty means every style. put ids in here to redo just a few
local ONLY = {}

-- what to pull. name is the folder under public/ui, pieces is the draw order
local SETS = {
  {
    path = 'UI/ChatBalloon.img',
    name = 'balloons',
    -- head is a topper some of the newer styles have. its width tracks arrow
    -- rather than c, so it is not a tiling strip like n is. dumped so we can
    -- look at it, not yet drawn
    pieces = { 'nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se', 'arrow', 'head' },
    -- the named entries that are still character balloons. the rest of the
    -- named ones (miniroom, messenger, popupSay, medal, nick, pet) are other
    -- UI entirely and would come out as nonsense
    extra = { dead = true, npc = true, tutorial = true },
  },
  {
    path = 'UI/NameTag.img',
    name = 'nametags',
    -- a name tag is only a horizontal 3-slice, no corners and no tail
    pieces = { 'w', 'c', 'e' },
    extra = {},
  },
}

------------------------------------------------------------
-- node helpers, same as the map dump

local function each_node(node)
  return coroutine.wrap(function()
    for _, n in each(node.Nodes) do
      coroutine.yield(n)
    end
  end)
end

local function child(node, name)
  if not node then return nil end
  for n in each_node(node) do
    if n.Text == name then return n end
  end
  return nil
end

local function resolve(path)
  local node = PluginManager.FindWz(path)
  if not node then return nil end
  local img = Wz_NodeExtension.GetNodeWzImage(node)
  if img and not img.Extracted then img:TryExtract() end
  return PluginManager.FindWz(path)
end

------------------------------------------------------------
-- sprite helpers

local t_IGifFrame = {}
t_IGifFrame.typeRef = luanet.import_type('WzComparerR2.Common.IGifFrame')
t_IGifFrame.Draw = luanet.get_method_bysig(
  t_IGifFrame.typeRef, 'Draw', 'System.Drawing.Graphics', 'System.Drawing.Rectangle')

local function findNodeFunc(path)
  return PluginManager.FindWz(path)
end

-- every balloon piece is a bare canvas, so CreateFromNode finds no numbered
-- children and returns nil. CreateFrameFromNode is the path that actually runs,
-- the same trap that silently ate 54 static map backs
local function toGif(node)
  local gif = Gif.CreateFromNode(node, findNodeFunc)
  if not gif then
    local frame = Gif.CreateFrameFromNode(node, findNodeFunc)
    if not frame then return nil end
    gif = Gif()
    gif.Frames:Add(frame)
  end
  return gif
end

local function disposeGif(gif)
  for _, frame in each(gif.Frames) do
    if frame.Bitmap then frame.Bitmap:Dispose() end
  end
end

------------------------------------------------------------
-- json

local function q(s) return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"') .. '"' end
local function kv(k, v) return q(k) .. ':' .. v end
local function ki(k, v) return kv(k, string.format('%d', v)) end
local function ks(k, v) return kv(k, q(v)) end

------------------------------------------------------------
-- a style is one balloon design. static ones hold the pieces directly, animated
-- ones hold a contiguous run of numbered children that are each a full set

local function frameNodesOf(styleNode)
  -- pieces sitting directly on the style means a single frame
  if child(styleNode, 'c') then return { styleNode } end

  -- otherwise look for 0,1,2.. each holding its own c
  local zero = child(styleNode, '0')
  if not zero or not child(zero, 'c') then return nil end

  local frames = {}
  local i = 0
  while true do
    local f = child(styleNode, string.format('%d', i))
    if not f then break end
    table.insert(frames, f)
    i = i + 1
  end
  return frames
end

-- lays every piece of every frame into one bitmap, a row per frame, and returns
-- the manifest entry for it
local function packStyle(styleNode, frameNodes, pieceNames, outDir, baseName)
  -- measure first so we know how big the strip has to be
  local rows = {}
  local stripW, stripH = 0, 0

  for _, fNode in ipairs(frameNodes) do
    local pieces = {}
    local rowW, rowH = 0, 0
    for _, name in ipairs(pieceNames) do
      local n = child(fNode, name)
      if n then
        local gif = toGif(n)
        if gif then
          local r = gif:GetRect()
          if r.Width >= 1 and r.Height >= 1 then
            table.insert(pieces, { name = name, gif = gif, rect = r, x = rowW })
            rowW = rowW + r.Width
            if r.Height > rowH then rowH = r.Height end
          else
            disposeGif(gif)
          end
        end
      end
    end
    if #pieces > 0 then
      table.insert(rows, { pieces = pieces, y = stripH, h = rowH })
      if rowW > stripW then stripW = rowW end
      stripH = stripH + rowH
    end
  end

  if #rows == 0 then return nil end

  -- draw
  local bmp = Bitmap(stripW, stripH, PixelFormat.Format32bppArgb)
  local g = Graphics.FromImage(bmp)
  for _, row in ipairs(rows) do
    for _, p in ipairs(row.pieces) do
      g:TranslateTransform(p.x, row.y)
      -- a piece is a single canvas so there is only ever one frame here, but
      -- iterate rather than index, indexing a .NET list from lua is not a
      -- binding the map script ever leaned on
      for _, frame in each(p.gif.Frames) do
        t_IGifFrame.Draw(frame, g, p.rect)
      end
      g:ResetTransform()
    end
  end
  g:Dispose()
  bmp:Save(Path.Combine(outDir, baseName .. '.png'), ImageFormat.Png)
  bmp:Dispose()

  -- manifest. ox/oy is the sprite origin offset, which is what says where the
  -- piece sits relative to the content box. nw is @-6,-6 so it hangs off the
  -- top left corner, c is @0,0 so it fills the box
  local frameJson = {}
  for _, row in ipairs(rows) do
    local parts = {}
    for _, p in ipairs(row.pieces) do
      table.insert(parts, kv(p.name, '{'
        .. ki('x', p.x) .. ',' .. ki('y', row.y) .. ','
        .. ki('w', p.rect.Width) .. ',' .. ki('h', p.rect.Height) .. ','
        .. ki('ox', p.rect.X) .. ',' .. ki('oy', p.rect.Y) .. '}'))
      disposeGif(p.gif)
    end
    table.insert(frameJson, '{' .. table.concat(parts, ',') .. '}')
  end

  -- clr is the text colour the balloon was designed for, so it travels with it
  local clrNode = child(styleNode, 'clr')
  local clr = clrNode and clrNode.Value ~= nil and tonumber(tostring(clrNode.Value)) or nil

  return '{'
    .. ks('file', baseName .. '.png') .. ','
    .. ki('w', stripW) .. ',' .. ki('h', stripH) .. ','
    .. kv('clr', clr and string.format('%d', clr) or 'null') .. ','
    .. kv('frames', '[' .. table.concat(frameJson, ',') .. ']')
    .. '}'
end

------------------------------------------------------------

local function wanted(name, extra)
  if #ONLY > 0 then
    for _, s in ipairs(ONLY) do
      if s == name then return true end
    end
    return false
  end
  -- numbered styles are the player balloons, everything else is other UI
  return tonumber(name) ~= nil or extra[name] == true
end

local function dumpSet(set)
  local root = resolve(set.path)
  if not root then
    env:WriteLine('not found: ' .. set.path .. '  (is Base.wz loaded?)')
    return
  end

  local outDir = Path.Combine(OUT_ROOT, set.name)
  if not Directory.Exists(outDir) then Directory.CreateDirectory(outDir) end

  local entries = {}
  local nStatic, nAni, nSkip = 0, 0, 0

  for styleNode in each_node(root) do
    if wanted(styleNode.Text, set.extra) then
      local frameNodes = frameNodesOf(styleNode)
      if not frameNodes then
        nSkip = nSkip + 1
        env:WriteLine('  no pieces, skipped: ' .. styleNode.Text)
      else
        local ok, entry = pcall(packStyle, styleNode, frameNodes,
          set.pieces, outDir, styleNode.Text)
        if not ok then
          env:WriteLine('  failed ' .. styleNode.Text .. ': ' .. tostring(entry))
        elseif entry then
          table.insert(entries, kv(styleNode.Text, entry))
          if #frameNodes > 1 then
            nAni = nAni + 1
            env:WriteLine('  ' .. styleNode.Text .. '  '
              .. string.format('%d', #frameNodes) .. ' frames')
          else
            nStatic = nStatic + 1
          end
        end
      end
    end
  end

  File.WriteAllText(Path.Combine(outDir, set.name .. '.json'),
    '{' .. ks('set', set.name) .. ',' .. q('styles') .. ':{'
    .. table.concat(entries, ',') .. '}}')

  env:WriteLine(string.format('%s -> %d static, %d animated, %d skipped  (%s)',
    set.name, nStatic, nAni, nSkip, outDir))
end

------------------------------------------------------------
-- screening, writes nothing

local function screenSet(set)
  local root = resolve(set.path)
  env:WriteLine('======== ' .. set.path .. ' ========')
  if not root then
    env:WriteLine('  not found. is Base.wz loaded, and is UI.wz next to it?')
    return
  end
  local n = 0
  for styleNode in each_node(root) do
    n = n + 1
    local parts = {}
    for piece in each_node(styleNode) do
      local w, h, ox, oy
      local gif = toGif(piece)
      if gif then
        local r = gif:GetRect()
        if r.Width >= 1 then w, h, ox, oy = r.Width, r.Height, r.X, r.Y end
        disposeGif(gif)
      end
      if w then
        table.insert(parts, string.format('%s %dx%d@%d,%d', piece.Text, w, h, ox, oy))
      else
        local kids = 0
        for _ in each_node(piece) do kids = kids + 1 end
        table.insert(parts, string.format('%s{%d}', piece.Text, kids))
      end
    end
    env:WriteLine('  [' .. styleNode.Text .. ']  ' .. table.concat(parts, '  '))
  end
  env:WriteLine('  -> ' .. string.format('%d', n) .. ' entries')
end

------------------------------------------------------------

for _, set in ipairs(SETS) do
  local fn = SCREEN_ONLY and screenSet or dumpSet
  local ok, err = pcall(fn, set)
  if not ok then env:WriteLine(set.path .. '  failed: ' .. tostring(err)) end
end

env:WriteLine('======== all done ========')
