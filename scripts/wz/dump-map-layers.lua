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
local MAP_IDS = {
}
local OUT_ROOT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\public\\maps'

-- true reports what each map holds and writes nothing, for deciding which ones
-- are worth screenshotting before you do the manual work
--
-- set both of these back (empty MAP_IDS, SCREEN_ONLY false) to go back to
-- dumping every map that has plates
local SCREEN_ONLY = false

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

  -- CreateFromNode walks numbered children, so it only works on a container.
  -- an obj path is always one, even for a single frame, but a static back path
  -- points straight at the canvas, so it found no frames and returned nil
  --
  -- CreateFrameFromNode takes a bare canvas and still resolves uol and links
  if not gif then
    local frame = Gif.CreateFrameFromNode(node, findNodeFunc)
    if not frame then return nil end
    gif = Gif()
    gif.Frames:Add(frame)
  end

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
        else
          -- saveSprite came back empty. used to be silent, which is how 54 of
          -- these went missing without a word
          env:WriteLine('EMPTY back ' .. entry.Text .. '  ani=' .. string.format('%d', ani)
            .. '  ' .. spritePath)
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
-- screening
--
-- counts what a map holds without exporting anything, so you can pick which
-- ones are worth the manual screenshotting

-- a still png node has named children like origin and _inlink, an animation has
-- numbered ones
local function frameCount(node)
  if not node then return 0 end
  local n = 0
  for c in each_node(node) do
    if tonumber(c.Text) then n = n + 1 end
  end
  if n == 0 then return 1 end
  return n
end

local function screenMap(MAP_ID)
  local mapPath = 'Map/Map/Map' .. MAP_ID:sub(1, 1) .. '/' .. MAP_ID .. '.img'
  local mapNode = resolve(mapPath)
  if not mapNode then
    env:WriteLine(MAP_ID .. '  not found')
    return
  end

  local nBack, nBackAni, nSpine, nCam = 0, 0, 0, 0
  local backRoot = child(mapNode, 'back')
  if backRoot then
    for entry in each_node(backRoot) do
      local bS = str(entry, 'bS', '')
      if bS ~= '' then
        nBack = nBack + 1
        local ani = num(entry, 'ani', 0)
        if ani == 2 then
          nSpine = nSpine + 1
        else
          local sub = (ani == 1) and 'ani' or 'back'
          local sprite = resolve('Map/Back/' .. bS .. '.img/' .. sub .. '/'
            .. string.format('%d', num(entry, 'no', 0)))
          if frameCount(sprite) > 1 then
            nBackAni = nBackAni + 1
            local t = num(entry, 'type', 0)
            -- same rule the index builder uses, a timer driven or map pinned
            -- axis does not care where the camera was
            --
            -- both axes, they are independent. a type 4 back scrolls on X but
            -- still takes the camera on Y
            local camX = t ~= 4 and t ~= 6 and (100 + num(entry, 'rx', 0)) ~= 0
            local camY = t ~= 5 and t ~= 7 and (100 + num(entry, 'ry', 0)) ~= 0
            if camX or camY then nCam = nCam + 1 end
          end
        end
      end
    end
  end

  local nObj, nObjAni = 0, 0
  for layer = 0, 7 do
    local objRoot = child(child(mapNode, string.format('%d', layer)), 'obj')
    if objRoot then
      for entry in each_node(objRoot) do
        local oS = str(entry, 'oS', '')
        if oS ~= '' then
          nObj = nObj + 1
          local sprite = resolve('Map/Obj/' .. oS .. '.img/'
            .. str(entry, 'l0', '') .. '/' .. str(entry, 'l1', '') .. '/'
            .. str(entry, 'l2', ''))
          if frameCount(sprite) > 1 then nObjAni = nObjAni + 1 end
        end
      end
    end
  end

  local info = child(mapNode, 'info')
  env:WriteLine(string.format(
    '%s  %dx%d  back %d (ani %d, spine %d)  obj %d (ani %d)  needsCam %d',
    MAP_ID,
    num(info, 'VRRight', 0) - num(info, 'VRLeft', 0),
    num(info, 'VRBottom', 0) - num(info, 'VRTop', 0),
    nBack, nBackAni, nSpine, nObj, nObjAni, nCam))

  -- back and obj are only 2 of the 12 things MapData.Load reads, so list what
  -- else is in here. particle and effect are the ones we currently ignore
  local kids = {}
  for c in each_node(mapNode) do table.insert(kids, c.Text) end
  table.sort(kids)
  local link = num(info, 'link', 0)
  env:WriteLine('   nodes: ' .. table.concat(kids, ' ')
    .. (link ~= 0 and ('   LINK -> ' .. string.format('%d', link)) or ''))

  -- particles are emitters rather than sprite sequences, so print the raw
  -- fields and we can work out whether they are reproducible at all
  local particle = child(mapNode, 'particle')
  if particle then
    for p in each_node(particle) do
      local fields = {}
      for f in each_node(p) do
        local v = f.Value
        table.insert(fields, f.Text .. (v ~= nil and ('=' .. tostring(v)) or ''))
      end
      env:WriteLine('   particle ' .. p.Text .. ':  ' .. table.concat(fields, '  '))
    end
  end
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
  if SCREEN_ONLY then
    local ok, err = pcall(screenMap, id)
    if not ok then env:WriteLine(id .. '  failed: ' .. tostring(err)) end
  else
    env:WriteLine('======== ' .. id .. ' ========')
    local ok, err = pcall(dumpMap, id)
    if not ok then env:WriteLine('failed: ' .. tostring(err)) end
  end
end

env:WriteLine('======== all done ========')
