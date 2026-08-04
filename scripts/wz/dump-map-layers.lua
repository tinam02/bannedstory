-- dumps one map's back + obj layers as separate sprites, plus a layers.json manifest
--
-- run it from the LuaConsole plugin in WzComparerR2, with Base.wz loaded
-- set MAP_ID below, hit run, then npm run maps
--
-- animated sprites come out as .apng, static ones as .png
-- Gif.CreateFromNode handles both, and it resolves _inlink/_outlink,
-- which is why hand-exporting a node in the tree often gives you an empty image

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'WzComparerR2.Encoders'
import 'System.IO'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

------------------------------------------------------------

-- leave this empty to do every map that already has plates on disk
local MAP_IDS = {}
local OUT_ROOT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\public\\maps'

------------------------------------------------------------
-- node helpers

-- no require 'Helper' here, we only need two of its functions and inlining
-- them means the script runs from anywhere
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

local function num(node, name, default)
  local c = child(node, name)
  if not c or c.Value == nil then return default end
  local v = tonumber(tostring(c.Value))
  if v == nil then return default end
  return v
end

local function str(node, name, default)
  local c = child(node, name)
  if not c or c.Value == nil then return default end
  return tostring(c.Value)
end

-- walks a path like Map/Back/grove.img/ani/3, extracting the .img on the way
local function resolve(path)
  local node = PluginManager.FindWz(path)
  if not node then return nil end
  local img = Wz_NodeExtension.GetNodeWzImage(node)
  if img and not img.Extracted then img:TryExtract() end
  return PluginManager.FindWz(path)
end

------------------------------------------------------------
-- sprite export

local t_IGifFrame = {}
t_IGifFrame.typeRef = luanet.import_type('WzComparerR2.Common.IGifFrame')
t_IGifFrame.Draw = luanet.get_method_bysig(
  t_IGifFrame.typeRef, 'Draw', 'System.Drawing.Graphics', 'System.Drawing.Rectangle')

local function findNodeFunc(path)
  return PluginManager.FindWz(path)
end

-- returns w, h, ox, oy, ext
-- ox/oy are the sprite rect offset, so the draw position is entry.x + ox
local function saveSprite(node, dirPath, baseName)
  local gif = Gif.CreateFromNode(node, findNodeFunc)
  if not gif then return nil end
  local rect = gif:GetRect()
  if rect.Width < 1 or rect.Height < 1 then return nil end

  local count = gif.Frames.Count
  local ext = (count > 1) and '.apng' or '.png'
  local fileName = Path.Combine(dirPath, baseName .. ext)

  if count > 1 then
    local enc = BuildInApngEncoder()
    enc:Init(fileName, rect.Width, rect.Height)
    enc.OptimizeEnabled = false
    for _, frame in each(gif.Frames) do
      local bmp = Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb)
      local g = Graphics.FromImage(bmp)
      t_IGifFrame.Draw(frame, g, rect)
      g:Dispose()
      enc:AppendFrame(bmp, frame.Delay)
      bmp:Dispose()
    end
    enc:Dispose()
  else
    local bmp = Bitmap(rect.Width, rect.Height, PixelFormat.Format32bppArgb)
    local g = Graphics.FromImage(bmp)
    for _, frame in each(gif.Frames) do
      t_IGifFrame.Draw(frame, g, rect)
    end
    g:Dispose()
    bmp:Save(fileName, ImageFormat.Png)
    bmp:Dispose()
  end

  for _, frame in each(gif.Frames) do
    if frame.Bitmap then frame.Bitmap:Dispose() end
  end

  return rect.Width, rect.Height, rect.X, rect.Y, ext, count
end

------------------------------------------------------------
-- manifest

local json
local function put(s) table.insert(json, s) end
local function q(s) return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"') .. '"' end
local function kv(k, v) return q(k) .. ':' .. v end
local function ki(k, v) return kv(k, string.format('%d', v)) end
local function ks(k, v) return kv(k, q(v)) end

------------------------------------------------------------
-- main

local function dumpMap(MAP_ID)
json = {}

local mapPath = 'Map/Map/Map' .. MAP_ID:sub(1, 1) .. '/' .. MAP_ID .. '.img'
local mapNode = resolve(mapPath)
if not mapNode then
  env:WriteLine('not found: ' .. mapPath .. '  (is Base.wz loaded?)')
  return
end

local outDir = Path.Combine(OUT_ROOT, MAP_ID .. '\\layers')
if not Directory.Exists(outDir) then Directory.CreateDirectory(outDir) end

-- VR bounds are the playable rect, everything else is positioned in the same
-- space, so this is what lines the layers up with each other
local info = child(mapNode, 'info')
put('{')
put(ks('id', MAP_ID) .. ',')
put(kv('vr', '{'
  .. ki('l', num(info, 'VRLeft', 0)) .. ','
  .. ki('t', num(info, 'VRTop', 0)) .. ','
  .. ki('r', num(info, 'VRRight', 0)) .. ','
  .. ki('b', num(info, 'VRBottom', 0)) .. '},'))

------------------------------------------------------------
-- back entries, the sky and the parallax scenery

put(q('back') .. ':[')
local backRoot = child(mapNode, 'back')
local first = true
if backRoot then
  for entry in each_node(backRoot) do
    local bS = str(entry, 'bS', '')
    local no = num(entry, 'no', 0)
    local ani = num(entry, 'ani', 0)

    if bS ~= '' then
      -- ani 0 lives under back/, ani 1 under ani/, ani 2 is spine and we skip it
      local sub = (ani == 1) and 'ani' or 'back'
      local spritePath = 'Map/Back/' .. bS .. '.img/' .. sub .. '/' .. string.format('%d', no)
      local sprite = resolve(spritePath)

      if ani == 2 then
        env:WriteLine('skip (spine) ' .. spritePath)
      elseif not sprite then
        env:WriteLine('missing ' .. spritePath)
      else
        local base = 'back-' .. entry.Text
        local w, h, ox, oy, ext, frames = saveSprite(sprite, outDir, base)
        if w then
          if not first then put(',') end
          first = false
          put('{'
            .. ks('file', base .. ext) .. ','
            .. ki('x', num(entry, 'x', 0)) .. ','
            .. ki('y', num(entry, 'y', 0)) .. ','
            .. ki('ox', ox) .. ',' .. ki('oy', oy) .. ','
            .. ki('w', w) .. ',' .. ki('h', h) .. ','
            .. ki('frames', frames) .. ','
            -- rx/ry are parallax rates, type is the tiling and auto-scroll mode,
            -- cx/cy the tile spacing, front means it draws over the character
            .. ki('rx', num(entry, 'rx', 0)) .. ',' .. ki('ry', num(entry, 'ry', 0)) .. ','
            .. ki('type', num(entry, 'type', 0)) .. ','
            .. ki('cx', num(entry, 'cx', 0)) .. ',' .. ki('cy', num(entry, 'cy', 0)) .. ','
            .. ki('a', num(entry, 'a', 255)) .. ','
            .. ki('f', num(entry, 'f', 0)) .. ','
            .. ki('front', num(entry, 'front', 0))
            .. '}')
          env:WriteLine('back ' .. entry.Text .. ' -> ' .. base .. ext
            .. ' (' .. string.format('%d', frames) .. 'f)')
        end
      end
    end
  end
end
put('],')

------------------------------------------------------------
-- obj entries, the scenery that sits in the map layers 0..7
--
-- the layer number is what decides whether the character draws in front of a
-- tree or behind it, which the flat front/back plates can't express

put(q('obj') .. ':[')
first = true
for layer = 0, 7 do
  local layerNode = child(mapNode, string.format('%d', layer))
  local objRoot = child(layerNode, 'obj')
  if objRoot then
    for entry in each_node(objRoot) do
      local oS = str(entry, 'oS', '')
      local l0 = str(entry, 'l0', '')
      local l1 = str(entry, 'l1', '')
      local l2 = str(entry, 'l2', '')

      if oS ~= '' then
        local spritePath = 'Map/Obj/' .. oS .. '.img/' .. l0 .. '/' .. l1 .. '/' .. l2
        local sprite = resolve(spritePath)
        if not sprite then
          env:WriteLine('missing ' .. spritePath)
        else
          local base = 'obj-' .. string.format('%d', layer) .. '-' .. entry.Text
          local w, h, ox, oy, ext, frames = saveSprite(sprite, outDir, base)
          if w then
            if not first then put(',') end
            first = false
            put('{'
              .. ks('file', base .. ext) .. ','
              .. ki('layer', layer) .. ','
              .. ki('x', num(entry, 'x', 0)) .. ','
              .. ki('y', num(entry, 'y', 0)) .. ','
              .. ki('z', num(entry, 'z', 0)) .. ','
              .. ki('ox', ox) .. ',' .. ki('oy', oy) .. ','
              .. ki('w', w) .. ',' .. ki('h', h) .. ','
              .. ki('frames', frames) .. ','
              .. ki('f', num(entry, 'f', 0))
              .. '}')
            if frames > 1 then
              env:WriteLine('obj ' .. base .. ext
                .. ' (' .. string.format('%d', frames) .. 'f)')
            end
          end
        end
      end
    end
  end
end
put(']}')

------------------------------------------------------------

File.WriteAllText(Path.Combine(outDir, 'layers.json'), table.concat(json, '\n'))
env:WriteLine('-------- wrote ' .. outDir .. ' --------')
end

------------------------------------------------------------

-- an empty MAP_IDS means every folder under public/maps, which is exactly the
-- maps that already have plates
if #MAP_IDS == 0 then
  for _, dir in each(Directory.GetDirectories(OUT_ROOT)) do
    table.insert(MAP_IDS, Path.GetFileName(dir))
  end
end

for _, id in ipairs(MAP_IDS) do
  env:WriteLine('======== ' .. id .. ' ========')
  local ok, err = pcall(dumpMap, id)
  if not ok then env:WriteLine('failed: ' .. tostring(err)) end
end

env:WriteLine('======== all done ========')
