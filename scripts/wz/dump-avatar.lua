-- pulls one character's layers out of Character.wz, with the anchors needed to
-- stack them, so we can try compositing without maplestory.io
--
-- run from LuaConsole with Base.wz loaded
--
-- this is a spike. one character, one stance, one frame. if the result matches
-- what maplestory.io renders for the same outfit then the whole approach holds
-- and the rest is a pipeline
--
-- position = parent + parentMap[anchor] - childMap[anchor], drawn at
-- pos - origin, sorted by the layer's z name in zmap

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'WzComparerR2.Encoders'
import 'System.IO'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

------------------------------------------------------------

local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-spike'

local STANCE = 'stand1'
local FRAME = '0'
-- the face is keyed by expression rather than stance
local EMOTION = 'default'

-- everything gets dumped, the node side picks which to include. that way trying
-- separates against an overall doesn't need another run through here
--
-- coat and longcoat both fill the chest, so wearing both is the vslot clash
-- worth watching. the coat also brings mailArm, which takes the body's own arm
-- slot away from it
local PARTS = {
  { key = 'body', id = 2000, path = 'Character/00002000.img' },
  { key = 'head', id = 12000, path = 'Character/00012000.img' },
  { key = 'face', id = 20000, path = 'Character/Face/00020000.img', byEmotion = true },
  { key = 'hair', id = 30000, path = 'Character/Hair/00030000.img' },
  { key = 'cap', id = 1002140, path = 'Character/Cap/01002140.img' },
  { key = 'coat', id = 1040002, path = 'Character/Coat/01040002.img' },
  { key = 'pants', id = 1060002, path = 'Character/Pants/01060002.img' },
  { key = 'shoes', id = 1070000, path = 'Character/Shoes/01070000.img' },
  { key = 'longcoat', id = 1050000, path = 'Character/Longcoat/01050000.img' },
}

------------------------------------------------------------

local function each_node(node)
  return coroutine.wrap(function()
    for _, n in each(node.Nodes) do coroutine.yield(n) end
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

local function findNodeFunc(path)
  return PluginManager.FindWz(path)
end

-- head, hair and equips reach their pixels through a uol, so every layer goes
-- through here before we read anything off it
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

-- saves the layer's pixels. _outlink means the bytes live elsewhere, and
-- CreateFrameFromNode is what follows that
local function savePng(node, file)
  local frame = Gif.CreateFrameFromNode(node, findNodeFunc)
  if not frame then return nil end
  local gif = Gif()
  gif.Frames:Add(frame)
  local rect = gif:GetRect()
  if rect.Width < 1 or rect.Height < 1 then return nil end

  local bmp = Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb)
  local g = Graphics.FromImage(bmp)
  t_IGifFrame.Draw(frame, g, rect)
  g:Dispose()
  bmp:Save(file, ImageFormat.Png)
  bmp:Dispose()
  if frame.Bitmap then frame.Bitmap:Dispose() end
  return rect.Width, rect.Height
end

local function q(s)
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"') .. '"'
end

local function vec(node)
  if not node or node.Value == nil then return nil end
  local ok, x = pcall(function() return node.Value.X end)
  if not ok or x == nil then return nil end
  return string.format('{"x":%d,"y":%d}', node.Value.X, node.Value.Y)
end

------------------------------------------------------------

if not Directory.Exists(OUT) then Directory.CreateDirectory(OUT) end

-- zmap is the draw order. index 0 is frontmost
local zorder = {}
local zmap = resolve('Base/zmap.img') or resolve('zmap.img')
if zmap then
  for c in each_node(zmap) do table.insert(zorder, q(c.Text)) end
end
env:WriteLine('zmap: ' .. string.format('%d', #zorder) .. ' names')

-- smap says which visual slot a layer sits in. an item's info/vslot lists the
-- slots it takes over, so a hat with vslot CpH1H5 removes the hair layer whose
-- smap slot is H1. that's how hats eat hair
local slots = {}
local smap = resolve('Base/smap.img') or resolve('smap.img')
if smap then
  for c in each_node(smap) do
    if c.Value ~= nil then
      table.insert(slots, q(c.Text) .. ':' .. q(tostring(c.Value)))
    end
  end
end
env:WriteLine('smap: ' .. string.format('%d', #slots) .. ' layers with a slot')

local layers = {}

for _, part in ipairs(PARTS) do
  local img = resolve(part.path)
  if not img then
    env:WriteLine('missing ' .. part.path)
  else
    -- equips and body are per stance, the face is per expression
    local frameNode
    if part.byEmotion then
      frameNode = child(child(img, EMOTION), FRAME) or child(img, EMOTION)
    else
      frameNode = child(child(img, STANCE), FRAME)
    end

    if not frameNode then
      env:WriteLine('no frame for ' .. part.key)
    else
      -- vslot says which layers this item suppresses on others, which is how a
      -- hat eats hair. carried through so the compositor can honour it
      local info = child(img, 'info')
      local vslot = info and child(info, 'vslot')
      local islot = info and child(info, 'islot')

      for raw in each_node(frameNode) do
        local layer = deref(raw)

        -- some layers are a run of frames rather than a single canvas, hairShade
        -- is one. no origin on the container, so take the first frame
        if layer and not child(layer, 'origin') then
          local first = child(layer, '0')
          if first then layer = deref(first) end
        end

        local origin = layer and child(layer, 'origin')
        if origin then
          local name = part.key .. '-' .. raw.Text
          local w, h = savePng(layer, Path.Combine(OUT, name .. '.png'))
          if w then
            local anchors = {}
            local mapNode = child(layer, 'map')
            if mapNode then
              for a in each_node(mapNode) do
                local v = vec(a)
                if v then table.insert(anchors, q(a.Text) .. ':' .. v) end
              end
            end
            local zNode = child(layer, 'z')
            table.insert(layers, '{'
              .. q('name') .. ':' .. q(name) .. ','
              .. q('part') .. ':' .. q(part.key) .. ','
              .. q('item') .. ':' .. string.format('%d', part.id) .. ','
              .. q('layer') .. ':' .. q(raw.Text) .. ','
              .. q('file') .. ':' .. q(name .. '.png') .. ','
              .. q('w') .. ':' .. string.format('%d', w) .. ','
              .. q('h') .. ':' .. string.format('%d', h) .. ','
              .. q('origin') .. ':' .. (vec(origin) or 'null') .. ','
              .. q('z') .. ':' .. q(zNode and tostring(zNode.Value) or raw.Text) .. ','
              .. q('vslot') .. ':' .. q(vslot and tostring(vslot.Value) or '') .. ','
              .. q('islot') .. ':' .. q(islot and tostring(islot.Value) or '') .. ','
              .. q('map') .. ':{' .. table.concat(anchors, ',') .. '}'
              .. '}')
            env:WriteLine(string.format('  %-18s %dx%d  z=%s', name, w, h,
              zNode and tostring(zNode.Value) or raw.Text))
          end
        end
      end
    end
  end
end

File.WriteAllText(Path.Combine(OUT, 'avatar.json'),
  '{' .. q('stance') .. ':' .. q(STANCE) .. ','
  .. q('frame') .. ':' .. q(FRAME) .. ','
  .. q('zmap') .. ':[' .. table.concat(zorder, ',') .. '],'
  .. q('smap') .. ':{' .. table.concat(slots, ',') .. '},'
  .. q('layers') .. ':[' .. table.concat(layers, ',') .. ']}')

env:WriteLine('wrote ' .. OUT .. '\\avatar.json  ('
  .. string.format('%d', #layers) .. ' layers)')
env:WriteLine('======== done ========')
