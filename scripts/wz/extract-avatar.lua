-- packs items out of Character.wz into one sheet each, plus a manifest
--
-- run from LuaConsole with Base.wz loaded
--
-- one sheet per item, not one file per canvas. a full extraction is around two
-- million canvases, which would be two million uploads and dozens of fetches to
-- draw one character. per item it's ~56k files and one fetch each
--
-- the same canvas is reached from many stances through uol, so it's stored once
-- and the frames reference it. that dedup is most of why a hat costs 3 canvases
-- and not 35
--
-- LIMIT keeps a trial run small. set it to 0 for everything

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'System'
import 'System.IO'
-- for the memory readout in the heartbeat
import 'System.Diagnostics'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

------------------------------------------------------------

local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-out'
local LOG = OUT .. '\\extract-log.txt'

-- items per folder. 0 means all of them
local LIMIT = 0

-- run one folder at a time by naming it here, eg 'Weapon'. empty does the lot
--
-- worth using. every .img we touch gets extracted, and WzComparerR2 keeps
-- extracted images in memory, so the whole of Character.wz resident is what
-- crashed it. a folder at a time keeps that bounded and makes a crash cost
-- minutes instead of the whole run
local ONLY = ''

-- items already written are skipped, so this is resumable. it still leaks
-- somewhere despite Unextract, so the way through a big folder is to run it,
-- let it die, restart WzComparerR2, run it again. each pass picks up where the
-- last one stopped
local REDO = false

-- redo just these ids and nothing else, for checking a change without sitting
-- through a full run. ids are as they appear in the output, leading zeros
-- stripped, so 00002000.img is '2000'. these eight are what avatar-spike wears
--
-- empty for a normal run
local ITEMS = {
  -- '2000', '12000', '20000', '30000', '1000000', '1040000', '1060000', '1070000',
}

-- how wide a packed sheet gets before it wraps to a new row
local SHEET_W = 1024

-- the stances the pose picker offers, and nothing else. an item img also holds
-- skill animations like psychicForce and MonsterPark_Commotion_SitUp, which is
-- most of its bulk and none of its use
local STANCES = {
  'default', 'backDefault',
  'stand1', 'stand2', 'walk1', 'walk2', 'alert', 'jump', 'sit',
  'prone', 'proneStab', 'fly', 'ladder', 'rope', 'heal',
  'shoot1', 'shoot2', 'shootF',
  'stabO1', 'stabO2', 'stabOF', 'stabT1', 'stabT2', 'stabTF',
  'swingO1', 'swingO2', 'swingO3', 'swingOF',
  'swingP1', 'swingP2', 'swingPF',
  'swingT1', 'swingT2', 'swingT3', 'swingTF',
}

-- byExpression folders are keyed by face animation rather than by stance, so
-- they take whatever top level keys they have
local FOLDERS = {
  { name = 'Cap', path = 'Character/Cap' },
  { name = 'Hair', path = 'Character/Hair' },
  { name = 'Face', path = 'Character/Face', byExpression = true },
  { name = 'Coat', path = 'Character/Coat' },
  { name = 'Longcoat', path = 'Character/Longcoat' },
  { name = 'Pants', path = 'Character/Pants' },
  { name = 'Shoes', path = 'Character/Shoes' },
  { name = 'Glove', path = 'Character/Glove' },
  { name = 'Cape', path = 'Character/Cape' },
  { name = 'Weapon', path = 'Character/Weapon' },
  -- the api files shields under Armor rather than Weapon, but wz keeps them in
  -- their own folder and the closet has always had a tab for them
  { name = 'Shield', path = 'Character/Shield' },
  -- face accessories, eye decorations and earrings all live in here together
  { name = 'Accessory', path = 'Character/Accessory' },
  -- the skins live loose at the root rather than in a folder
  { name = 'Body', path = 'Character', match = '^000020%d%d%.img$' },
  { name = 'Head', path = 'Character', match = '^000120%d%d%.img$' },
}

------------------------------------------------------------

-- appended as it goes rather than written at the end. a run this long can die
-- on one bad item, and a log that only exists on success tells you nothing
local function say(s)
  env:WriteLine(s)
  -- char(13,10) rather than an escape, so nothing can mangle it on the way in
  pcall(function() File.AppendAllText(LOG, s .. string.char(13, 10)) end)
end

-- what's actually sitting in a folder, which is not what this pass wrote. a
-- resumed run skips most of a folder, so its own counters say 0 while the
-- folder is 180 MB. this is the number to size the hosting off
local function onDisk(dir)
  local items, bytes = 0, 0
  local ok = pcall(function()
    for _, f in each(Directory.GetFiles(dir)) do
      bytes = bytes + FileInfo(f).Length
      if f:find('%.json$') then items = items + 1 end
    end
  end)
  if not ok then return nil, nil end
  return items, bytes
end

-- lua first, then dotnet, and the order is the whole point.
--
-- every canvas we touch is held in a lua table as an nlua proxy: tiny on the
-- lua heap, pinning a big bitmap on the dotnet one. lua feels no pressure so it
-- never collects on its own, and dotnet cannot free what lua still points at,
-- which is why collecting only one side did nothing.
--
-- the second Collect is for the bitmaps. anything with a finalizer needs one
-- pass to queue it and another to actually release
local function sweep()
  collectgarbage('collect')
  pcall(function()
    GC.Collect()
    GC.WaitForPendingFinalizers()
    GC.Collect()
  end)
end

-- roughly what the process is holding, so the heartbeat can show whether any of
-- the above is working instead of us waiting an hour to find out
local function memMB()
  local ok, mb = pcall(function()
    return Process.GetCurrentProcess().PrivateMemorySize64 / 1048576
  end)
  if ok and mb then return mb end
  local ok2, mb2 = pcall(function() return GC.GetTotalMemory(false) / 1048576 end)
  return ok2 and mb2 or 0
end

local function each_node(node)
  return coroutine.wrap(function()
    for _, n in each(node.Nodes) do coroutine.yield(n) end
  end)
end

-- a node's Text, or nil if it hasn't got one.
--
-- each_node occasionally hands back something that is not a node, and indexing
-- .Text on it takes down the whole item. rare, two in fifty thousand, but a
-- skipped item is a hairstyle missing from the app so it's worth the guard
local function textOf(n)
  if type(n) ~= 'userdata' and type(n) ~= 'table' then return nil end
  local ok, txt = pcall(function() return n.Text end)
  if ok and txt ~= nil then return tostring(txt) end
  return nil
end

-- deliberately runs the whole loop instead of returning on the match.
--
-- each_node is a coroutine, and bailing out early leaves it suspended forever
-- still holding its enumerator over the node collection. this is the hottest
-- function here, a few calls per layer per stance, so those abandoned
-- enumerators were most of why the run kept dying. a node has a few dozen
-- children, so reading all of them costs nothing worth measuring
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

local function findNodeFunc(path) return PluginManager.FindWz(path) end

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

-- pulls one item into a set of unique canvases plus the frames that use them
--
-- two levels, and the split matters. _inlink and _outlink share PIXELS between
-- nodes, they do not share geometry: a shoe reuses one image across the three
-- frames of stand1 while carrying a different navel in each, because the foot
-- moves. keying everything off the link target kept only the first node's
-- origin and map and silently gave the other frames the wrong ones, which put
-- the shoes 2px out in stand1 frame 2 and cost a pixel or two in half a dozen
-- other stances
--
-- so: slots are the packed images, deduped by link target. canvases are the
-- nodes, one per node, each pointing at a slot for its pixels and carrying its
-- own origin, z and map
local function collect(img, keys)
  local slots = {}      -- pixel key -> { frame, rect, w, h, sx, sy }
  local slotOrder = {}
  local canvases = {}   -- node path -> { slot, node, idx }
  local order = {}
  local frames = {}     -- stance -> { [frameIndex] = { layer -> nodeKey } }
  local total = 0

  for _, stance in ipairs(keys) do
    local sNode = child(img, stance)
    if sNode then
      local perFrame = {}
      for frameNode in each_node(sNode) do
        if tonumber(frameNode.Text) then
          local layers = {}
          for raw in each_node(frameNode) do
            local c = deref(raw)
            -- a layer can be a run of frames rather than a canvas, take the first
            if c and not child(c, 'origin') then
              local first = child(c, '0')
              if first then c = deref(first) end
            end
            if c and child(c, 'origin') then
              local nodeKey = tostring(c.FullPath)
              -- where the pixels really live, which may be another node
              local pixKey = nodeKey
              for f in each_node(c) do
                local t = textOf(f)
                if t == '_outlink' or t == '_inlink' then
                  pixKey = tostring(f.Value)
                end
              end

              if not slots[pixKey] then
                local frame = Gif.CreateFrameFromNode(c, findNodeFunc)
                if frame then
                  local gif = Gif()
                  gif.Frames:Add(frame)
                  local rect = gif:GetRect()
                  if rect.Width >= 1 and rect.Height >= 1 then
                    slots[pixKey] = {
                      frame = frame, rect = rect,
                      w = rect.Width, h = rect.Height,
                    }
                    table.insert(slotOrder, pixKey)
                  end
                end
              end

              if slots[pixKey] then
                if not canvases[nodeKey] then
                  canvases[nodeKey] = { slot = pixKey, node = c, idx = #order }
                  table.insert(order, nodeKey)
                  total = total + 1
                end
                layers[raw.Text] = nodeKey
              end
            end
          end
          if next(layers) then
            perFrame[tonumber(frameNode.Text)] = layers
          end
        end
      end
      if next(perFrame) then frames[stance] = perFrame end
    end
  end

  return canvases, order, frames, total, slots, slotOrder
end

-- shelf packing, tallest first so the rows stay tight. packs the slots, so an
-- image shared by several nodes is still only in the sheet once
local function pack(slots, order)
  local sorted = {}
  for _, k in ipairs(order) do table.insert(sorted, k) end
  table.sort(sorted, function(a, b) return slots[a].h > slots[b].h end)

  local x, y, rowH, sheetW = 0, 0, 0, 0
  for _, k in ipairs(sorted) do
    local c = slots[k]
    if x > 0 and x + c.w > SHEET_W then
      x = 0
      y = y + rowH
      rowH = 0
    end
    c.sx, c.sy = x, y
    x = x + c.w
    if x > sheetW then sheetW = x end
    if c.h > rowH then rowH = c.h end
  end
  return math.max(sheetW, 1), math.max(y + rowH, 1)
end

------------------------------------------------------------

if not Directory.Exists(OUT) then Directory.CreateDirectory(OUT) end
-- kept across passes rather than wiped, since it takes several of them to get
-- through a folder and the interesting part is usually the pass before this one
say('')
say('starting, LIMIT=' .. string.format('%d', LIMIT))

-- zmap is the draw order, smap says which slot each layer sits in. both are
-- global, so they live beside the items rather than inside every one of them
do
  local zorder, slots = {}, {}
  local zmap = resolve('Base/zmap.img') or resolve('zmap.img')
  if zmap then
    for c in each_node(zmap) do table.insert(zorder, q(c.Text)) end
  end
  local smap = resolve('Base/smap.img') or resolve('smap.img')
  if smap then
    for c in each_node(smap) do
      if c.Value ~= nil then
        table.insert(slots, q(c.Text) .. ':' .. q(tostring(c.Value)))
      end
    end
  end
  File.WriteAllText(Path.Combine(OUT, 'meta.json'),
    '{' .. q('zmap') .. ':[' .. table.concat(zorder, ',') .. '],'
    .. q('smap') .. ':{' .. table.concat(slots, ',') .. '}}')
  say(string.format('meta.json: %d zmap names, %d smap slots', #zorder, #slots))
end

local grandItems, grandCanvases, grandBytes = 0, 0, 0
local reported = false
-- folders we've already announced the key shape for, said once each
local shapes = {}

-- ITEMS as a set, or nil when it's empty and we're doing a normal run
local wanted = nil
if #ITEMS > 0 then
  wanted = {}
  for _, id in ipairs(ITEMS) do wanted[id] = true end
  say('targeted redo of ' .. #ITEMS .. ' items, everything else skipped')
end

for _, folder in ipairs(FOLDERS) do
  if ONLY ~= '' and folder.name ~= ONLY then goto nextFolder end
  local root = resolve(folder.path)
  if not root then
    say('no ' .. folder.path)
  else
    local dir = Path.Combine(OUT, folder.name)
    if not Directory.Exists(dir) then Directory.CreateDirectory(dir) end

    local names = {}
    for c in each_node(root) do
      local ok = c.Text:find('%.img$') ~= nil
      if ok and folder.match then ok = c.Text:find(folder.match) ~= nil end
      if ok then table.insert(names, c.Text) end
    end
    table.sort(names)

    local done, canvasCount, byteCount, failed = 0, 0, 0, 0
    -- counts every item, where `done` only counts the ones that produced
    -- something. beating on `done` meant a folder yielding nothing logged a
    -- heartbeat per item, since 0 % 250 is 0 every time
    local seen = 0
    for _, name in ipairs(names) do
      if LIMIT > 0 and done >= LIMIT then break end
      -- a heartbeat, so if this dies the log names where it got to
      if seen % 250 == 0 then
        say(string.format('  ... %s %d/%d, at %s, %.0f MB',
          folder.name, seen, #names, name, memMB()))
      end
      seen = seen + 1
      local doneId = name:gsub('%.img$', ''):gsub('^0+', '')
      if wanted then
        -- a targeted redo, so everything else is not our business and the
        -- already-written check does not apply to the ones that are
        if not wanted[doneId] then goto nextItem end
      elseif not REDO and File.Exists(Path.Combine(dir, doneId .. '.json')) then
        -- already done on an earlier pass
        done = done + 1
        goto nextItem
      end

      local img = resolve(folder.path .. '/' .. name)
      if img then
        -- whatever this item actually has at the top, minus info
        local function ownKeys()
          local out = {}
          for c in each_node(img) do
            if c.Text ~= 'info' then table.insert(out, c.Text) end
          end
          return out
        end

        local keys = STANCES
        if folder.byExpression then keys = ownKeys() end

        local function doItem()
          local canvases, order, frames, total, slots, slotOrder = collect(img, keys)

          -- the stance whitelist found nothing, so this item isn't keyed by
          -- pose. face accessories follow expressions the way Face does, and
          -- anything else keyed its own way lands here too. retry on its own
          -- keys rather than skip it, and say what they were the first time so
          -- we learn the shape instead of guessing at it
          if (not total or total < 1) and keys == STANCES then
            local mine = ownKeys()
            if #mine > 0 then
              if not shapes[folder.name] then
                shapes[folder.name] = true
                say('  ' .. folder.name .. ' is not keyed by stance, using its own: '
                  .. table.concat(mine, ' ', 1, math.min(#mine, 12))
                  .. (#mine > 12 and (' ... ' .. #mine .. ' total') or ''))
              end
              canvases, order, frames, total, slots, slotOrder = collect(img, mine)
            end
          end

          if not total or total < 1 then return 0, 0 end
          local sw, sh = pack(slots, slotOrder)
          -- gdi+ throws a bare "parameter is not valid" on a bitmap it can't
          -- allocate, which tells you nothing, so refuse the daft ones here
          if sw * sh > 40000000 then
            error('sheet would be ' .. string.format('%dx%d', sw, sh))
          end
          local bmp = Bitmap(sw, sh, PixelFormat.Format32bppArgb)
          local g = Graphics.FromImage(bmp)
          for _, k in ipairs(slotOrder) do
            local s = slots[k]
            g:TranslateTransform(s.sx, s.sy)
            t_IGifFrame.Draw(s.frame, g, s.rect)
            g:ResetTransform()
          end
          g:Dispose()

          local id = name:gsub('%.img$', ''):gsub('^0+', '')
          if id == '' then error('no id in ' .. name) end
          local png = Path.Combine(dir, id .. '.png')
          bmp:Save(png, ImageFormat.Png)
          bmp:Dispose()
          for _, k in ipairs(slotOrder) do
            if slots[k].frame.Bitmap then slots[k].frame.Bitmap:Dispose() end
          end

          -- manifest. the rect comes from the shared slot, everything else from
          -- the node itself, so two frames reusing one image still each keep
          -- their own origin and anchors. the shape on disk is unchanged, there
          -- are just more entries and some of them point at the same pixels
          local info = child(img, 'info')
          local parts = {}
          for _, k in ipairs(order) do
            local c = canvases[k]
            local s = slots[c.slot]
            local anchors = {}
            local mapNode = child(c.node, 'map')
            if mapNode then
              for a in each_node(mapNode) do
                local v = vec(a)
                if v then table.insert(anchors, q(a.Text) .. ':' .. v) end
              end
            end
            local zNode = child(c.node, 'z')
            table.insert(parts, q(string.format('%d', c.idx)) .. ':{'
              .. q('x') .. ':' .. string.format('%d', s.sx) .. ','
              .. q('y') .. ':' .. string.format('%d', s.sy) .. ','
              .. q('w') .. ':' .. string.format('%d', s.w) .. ','
              .. q('h') .. ':' .. string.format('%d', s.h) .. ','
              .. q('origin') .. ':' .. (vec(child(c.node, 'origin')) or 'null') .. ','
              .. q('z') .. ':' .. q(zNode and tostring(zNode.Value) or '') .. ','
              .. q('map') .. ':{' .. table.concat(anchors, ',') .. '}}')
          end

          local fparts = {}
          for stance, perFrame in pairs(frames) do
            local fl = {}
            local idxs = {}
            for idx in pairs(perFrame) do table.insert(idxs, idx) end
            table.sort(idxs)
            for _, idx in ipairs(idxs) do
              local ll = {}
              for layer, key in pairs(perFrame[idx]) do
                table.insert(ll, q(layer) .. ':' .. string.format('%d', canvases[key].idx))
              end
              table.insert(fl, '{' .. table.concat(ll, ',') .. '}')
            end
            table.insert(fparts, q(stance) .. ':[' .. table.concat(fl, ',') .. ']')
          end

          local vslot = info and child(info, 'vslot')
          local islot = info and child(info, 'islot')
          File.WriteAllText(Path.Combine(dir, id .. '.json'),
            '{' .. q('id') .. ':' .. id .. ','
            .. q('sheet') .. ':' .. q(id .. '.png') .. ','
            .. q('islot') .. ':' .. q(islot and tostring(islot.Value) or '') .. ','
            .. q('vslot') .. ':' .. q(vslot and tostring(vslot.Value) or '') .. ','
            .. q('canvases') .. ':{' .. table.concat(parts, ',') .. '},'
            .. q('frames') .. ':{' .. table.concat(fparts, ',') .. '}}')

          return total, FileInfo(png).Length
        end

        -- one odd item out of tens of thousands shouldn't end the run, so it
        -- gets logged and skipped instead
        local ok, gotCanvases, gotBytes = pcall(doItem)

        -- hand the pixels back. without this every image we open stays in
        -- memory and the process falls over a few thousand items in, which is
        -- exactly how the first full run died
        local freed = pcall(function()
          local wzimg = Wz_NodeExtension.GetNodeWzImage(img)
          if wzimg and wzimg.Extracted then wzimg:Unextract() end
        end)
        -- said once. a silent failure here means the same OutOfMemory an hour
        -- from now, so it's worth knowing before then
        if not reported then
          reported = true
          say(freed and '  releasing images as we go, memory should hold'
            or '  WARNING Unextract did not bind, this will run out of memory')
        end
        if done % 50 == 0 then sweep() end
        if ok and gotCanvases and gotCanvases > 0 then
          done = done + 1
          canvasCount = canvasCount + gotCanvases
          byteCount = byteCount + gotBytes
        elseif not ok then
          failed = failed + 1
          if failed <= 20 then
            say('  FAILED ' .. folder.name .. '/' .. name .. ': ' .. tostring(gotCanvases))
          end
        end
      end
      ::nextItem::
    end

    local diskItems, diskBytes = onDisk(dir)
    if not diskItems then
      diskItems, diskBytes = done, byteCount
    end
    grandItems = grandItems + diskItems
    grandCanvases = grandCanvases + canvasCount
    grandBytes = grandBytes + diskBytes
    say(string.format('%-10s %5d of %5d items  %7d canvases  %8.2f MB  (%.1f KB/item)%s',
      folder.name, diskItems, #names, canvasCount, diskBytes / 1048576,
      diskItems > 0 and (diskBytes / diskItems / 1024) or 0,
      failed > 0 and ('  ' .. string.format('%d', failed) .. ' FAILED') or ''))
  end
  ::nextFolder::
end

say(string.format('TOTAL %d items, %d canvases, %.2f MB',
  grandItems, grandCanvases, grandBytes / 1048576))
if LIMIT > 0 then
  say('this was a LIMIT=' .. string.format('%d', LIMIT) .. ' trial, not the full set')
end

env:WriteLine('log at ' .. LOG)
