-- dumps the cash shop coin
--
-- writes public/ui/cash/coin.png, one horizontal strip of every frame

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'System'
import 'System.IO'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\public\\ui\\cash'

local PATHS = {
  'UI/CashShop.img/CashItem',
  'UI/CashShop.img/cashItem',
  'UI/CashShop.img/CashShop/CashItem',
}

local DEFAULT_MS = 120

local function each_node(node)
  return coroutine.wrap(function()
    for _, n in each(node.Nodes) do coroutine.yield(n) end
  end)
end

local function textOf(n)
  if type(n) ~= 'userdata' and type(n) ~= 'table' then return nil end
  local ok, t = pcall(function() return n.Text end)
  if ok and t ~= nil then return tostring(t) end
  return nil
end

local function child(node, name)
  if not node then return nil end
  local found = nil
  for n in each_node(node) do
    if found == nil and textOf(n) == name then found = n end
  end
  return found
end

local function resolve(path)
  local node = PluginManager.FindWz(path)
  if not node then return nil end
  local img = Wz_NodeExtension.GetNodeWzImage(node)
  if img and not img.Extracted then img:TryExtract() end
  return PluginManager.FindWz(path)
end

-- has to extract the target, not just look it up.
--
-- an item can keep its pixels in a separate _Canvas img and point at it with
-- _outlink, and CreateFrameFromNode calls this to follow that link. FindWz on
-- its own returns nothing for an img nobody has extracted yet, so the frame
-- came back as a 1x1 placeholder and the item drew nothing. 742 of 1660 capes
-- were empty for exactly this reason
local function findNodeFunc(path)
  local node = PluginManager.FindWz(path)
  if not node then return nil end
  local img = Wz_NodeExtension.GetNodeWzImage(node)
  if img and not img.Extracted then img:TryExtract() end
  return PluginManager.FindWz(path)
end

local function deref(node)
  if not node then return nil end
  local ok, got = pcall(function() return Wz_NodeExtension.ResolveUol(node) end)
  if ok and got ~= nil then return got end
  return node
end

local t_IGifFrame = {}
t_IGifFrame.typeRef = luanet.import_type('WzComparerR2.Common.IGifFrame')
t_IGifFrame.Draw = luanet.get_method_bysig(
  t_IGifFrame.typeRef, 'Draw', 'System.Drawing.Graphics', 'System.Drawing.Rectangle')

local function q(s) return '"' .. tostring(s) .. '"' end

------------------------------------------------------------

if not Directory.Exists(OUT) then Directory.CreateDirectory(OUT) end

local root, usedPath = nil, nil
for _, p in ipairs(PATHS) do
  root = resolve(p)
  if root then usedPath = p break end
end

if not root then
  env:WriteLine('none of these resolved, is Base.wz loaded?')
  for _, p in ipairs(PATHS) do env:WriteLine('  ' .. p) end
  return
end

env:WriteLine('found ' .. usedPath)

-- what is actually under there, printed before anything else, so a wrong node
-- shows up as a list of names rather than an empty png
local names = {}
for n in each_node(root) do table.insert(names, textOf(n) or '?') end
env:WriteLine('  children: ' .. table.concat(names, ' ', 1, math.min(#names, 20))
  .. (#names > 20 and (' ... ' .. #names .. ' total') or ''))

-- the frames, in order. numbered children are the animation
local idxs = {}
for n in each_node(root) do
  local i = tonumber(textOf(n) or '')
  if i then table.insert(idxs, i) end
end
table.sort(idxs)

if #idxs == 0 then
  env:WriteLine('  no numbered frames here, so this is the wrong node')
  return
end

local frames = {}
for _, i in ipairs(idxs) do
  local node = deref(child(root, string.format('%d', i)))
  if node then
    local ok = pcall(function()
      local f = Gif.CreateFrameFromNode(node, findNodeFunc)
      if not f then return end
      local gif = Gif()
      gif.Frames:Add(f)
      local rect = gif:GetRect()
      if rect.Width < 1 or rect.Height < 1 then return end
      local d = child(node, 'delay')
      table.insert(frames, {
        frame = f,
        rect = rect,
        w = rect.Width,
        h = rect.Height,
        ms = (d and d.Value ~= nil) and math.abs(tonumber(tostring(d.Value)) or DEFAULT_MS) or DEFAULT_MS,
      })
    end)
    if not ok then env:WriteLine('  frame ' .. i .. ' failed') end
  end
end

if #frames == 0 then
  env:WriteLine('  nothing drawable')
  return
end

-- one strip, laid out left to right, every frame the same height
local sw, sh = 0, 0
for _, f in ipairs(frames) do
  sw = sw + f.w
  if f.h > sh then sh = f.h end
end

local bmp = Bitmap(sw, sh, PixelFormat.Format32bppArgb)
local g = Graphics.FromImage(bmp)
local x = 0
local parts = {}
for _, f in ipairs(frames) do
  g:TranslateTransform(x, 0)
  t_IGifFrame.Draw(f.frame, g, f.rect)
  g:ResetTransform()
  table.insert(parts, '{'
    .. q('x') .. ':' .. string.format('%d', x) .. ','
    .. q('y') .. ':0,'
    .. q('w') .. ':' .. string.format('%d', f.w) .. ','
    .. q('h') .. ':' .. string.format('%d', f.h) .. ','
    .. q('ms') .. ':' .. string.format('%d', f.ms) .. '}')
  x = x + f.w
end
g:Dispose()

bmp:Save(Path.Combine(OUT, 'coin.png'), ImageFormat.Png)
bmp:Dispose()
for _, f in ipairs(frames) do
  if f.frame.Bitmap then f.frame.Bitmap:Dispose() end
end

File.WriteAllText(Path.Combine(OUT, 'coin.json'),
  '{' .. q('file') .. ':' .. q('coin.png') .. ','
  .. q('w') .. ':' .. string.format('%d', sw) .. ','
  .. q('h') .. ':' .. string.format('%d', sh) .. ','
  .. q('frames') .. ':[' .. table.concat(parts, ',') .. ']}')

env:WriteLine(string.format('%d frames, strip %dx%d -> %s', #frames, sw, sh, OUT))
