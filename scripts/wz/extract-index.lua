-- builds the closet's own item index: names, cash flags and icons
--
-- run from LuaConsole with Base.wz loaded, after extract-avatar.lua
--
--
-- two outputs per folder, both into .avatar-out/index
--   <Folder>.json        [{id, name, cash, x, y, w, h}, ...]
--   <Folder>-icons.png   every icon packed into one sheet
--
-- one sheet per category rather than one file per icon, because a closet tab
-- showing 50 icons would otherwise be 50 requests, and there are 59k equips

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'System'
import 'System.IO'
-- for the memory readout, without it every heartbeat just says 0 MB
import 'System.Diagnostics'
import 'System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
import 'System.Drawing'
import 'System.Drawing.Imaging'

------------------------------------------------------------

local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-out\\index'
local LOG = OUT .. '\\index-log.txt'

-- 0 for everything
local LIMIT = 0

-- one folder at a time, eg 'Longcoat'. empty does the lot
local ONLY = ''

local SHEET_W = 1024

-- items per sheet, and the unit of resuming.
--
-- the leak is about 41 KB an item and this is a 32 bit process, so a folder the
-- size of Hair (17431) cannot finish in one go however carefully it is written.
-- it dies around 1.1 GB either way. so the folder is cut into chunks that each
-- write their own sheet and their own slice of the index, and a chunk already
-- on disk is skipped. run it, let it die, restart, run again
--
-- 3000 is about 250 MB of growth per chunk, which leaves plenty of headroom
local CHUNK = 3000

-- chunks already written are skipped. set true to rebuild from scratch
local REDO = false

-- the closet's tabs, and where their art lives. the Face and Hair entries are
-- here for the icons, their names come from the same place as everything else
local FOLDERS = {
  { name = 'Cap', path = 'Character/Cap' },
  { name = 'Hair', path = 'Character/Hair' },
  { name = 'Face', path = 'Character/Face' },
  { name = 'Coat', path = 'Character/Coat' },
  { name = 'Longcoat', path = 'Character/Longcoat' },
  { name = 'Pants', path = 'Character/Pants' },
  { name = 'Shoes', path = 'Character/Shoes' },
  { name = 'Glove', path = 'Character/Glove' },
  { name = 'Cape', path = 'Character/Cape' },
  { name = 'Weapon', path = 'Character/Weapon' },
  { name = 'Accessory', path = 'Character/Accessory' },
}

------------------------------------------------------------

local function say(s)
  env:WriteLine(s)
  pcall(function() File.AppendAllText(LOG, s .. string.char(13, 10)) end)
end

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

-- runs the whole loop rather than returning early, see extract-avatar.lua
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
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"')
    :gsub('\r', ' '):gsub('\n', ' '):gsub('\t', ' ') .. '"'
end

local function sweep()
  collectgarbage('collect')
  pcall(function()
    GC.Collect()
    GC.WaitForPendingFinalizers()
    GC.Collect()
  end)
end

local function memMB()
  local ok, mb = pcall(function()
    return Process.GetCurrentProcess().PrivateMemorySize64 / 1048576
  end)
  return (ok and mb) or 0
end

------------------------------------------------------------

if not Directory.Exists(OUT) then Directory.CreateDirectory(OUT) end
say('')
say('starting index build')

-- every equip name, keyed by id. one walk of String/Eqp.img rather than a
-- lookup per item, since it is one img and we want nearly all of it
local NAMES = {}
do
  local eqp = resolve('String/Eqp.img') or resolve('Eqp.img')
  if not eqp then
    say('no String/Eqp.img, is Base.wz loaded? names will be blank')
  else
    local root = child(eqp, 'Eqp') or eqp
    local n = 0
    for category in each_node(root) do
      for item in each_node(category) do
        local id = tonumber(textOf(item) or '')
        local nameNode = child(item, 'name')
        if id and nameNode and nameNode.Value ~= nil then
          NAMES[id] = tostring(nameNode.Value)
          n = n + 1
        end
      end
    end
    say(string.format('names: %d equips from String/Eqp.img', n))
  end
end

------------------------------------------------------------

for _, folder in ipairs(FOLDERS) do
  if ONLY ~= '' and folder.name ~= ONLY then goto nextFolder end
  local root = resolve(folder.path)
  if not root then
    say('no ' .. folder.path)
    goto nextFolder
  end

  if not REDO and File.Exists(Path.Combine(OUT, folder.name .. '.json')) then
    say(folder.name .. ': already done')
    goto nextFolder
  end

  local names = {}
  for c in each_node(root) do
    local t = textOf(c)
    if t and t:find('%.img$') then table.insert(names, t) end
  end
  table.sort(names)

  -- opens one item's icon and hands it to `use`, which must be done with it
  -- before returning. nothing survives the call, which is the point: holding
  -- every icon of a folder at once is what ran this out of memory
  local function withIcon(name, use)
    local img = resolve(folder.path .. '/' .. name)
    if not img then return nil end
    local out = nil
    pcall(function()
      local info = child(img, 'info')
      -- iconRaw is the item on its own, icon is the same thing on a backing
      -- plate. raw first, so the closet can style its own tiles
      local node = info and (child(info, 'iconRaw') or child(info, 'icon'))
      node = node and deref(node)
      if not node then return end
      local frame = Gif.CreateFrameFromNode(node, findNodeFunc)
      if not frame then return end
      local gif = Gif()
      gif.Frames:Add(frame)
      local rect = gif:GetRect()
      if rect.Width >= 1 and rect.Height >= 1 then
        local cashNode = info and child(info, 'cash')
        out = use(frame, rect, cashNode ~= nil and tostring(cashNode.Value) ~= '0')
      end
      if frame.Bitmap then frame.Bitmap:Dispose() end
    end)
    pcall(function()
      local wzimg = Wz_NodeExtension.GetNodeWzImage(img)
      if wzimg and wzimg.Extracted then wzimg:Unextract() end
    end)
    return out
  end

  if LIMIT > 0 then
    while #names > LIMIT do table.remove(names) end
  end

  local nChunks = math.max(1, math.ceil(#names / CHUNK))
  local partPath = function(i)
    return Path.Combine(OUT, string.format('%s-part-%d.json', folder.name, i))
  end
  local sheetPath = function(i)
    return Path.Combine(OUT, string.format('%s-icons-%d.png', folder.name, i))
  end

  for ci = 0, nChunks - 1 do
    if not REDO and File.Exists(partPath(ci)) and File.Exists(sheetPath(ci)) then
      goto nextChunk
    end

    local lo, hi = ci * CHUNK + 1, math.min((ci + 1) * CHUNK, #names)
    say(string.format('  %s chunk %d/%d, items %d-%d, %.0f MB',
      folder.name, ci + 1, nChunks, lo, hi, memMB()))

    -- pass one, sizes only. a second read of each item later is cheap next to
    -- holding every bitmap of a chunk at once
    local metas, order = {}, {}
    for i = lo, hi do
      local name = names[i]
      local id = tonumber((name:gsub('%.img$', '')))
      if id then
        local m = withIcon(name, function(_, rect, cash)
          return { w = rect.Width, h = rect.Height, cash = cash, file = name }
        end)
        if m then
          metas[id] = m
          table.insert(order, id)
        end
      end
      if (i - lo) % 50 == 0 then sweep() end
    end

    if #order == 0 then
      say('   nothing in this chunk')
      pcall(function() File.WriteAllText(partPath(ci), '') end)
      goto nextChunk
    end

    -- shelf pack, tallest first. one sheet per chunk
    local sorted = {}
    for _, k in ipairs(order) do table.insert(sorted, k) end
    table.sort(sorted, function(a, b) return metas[a].h > metas[b].h end)
    local x, y, rowH, sw, sh = 0, 0, 0, 1, 1
    for _, k in ipairs(sorted) do
      local c = metas[k]
      if x > 0 and x + c.w > SHEET_W then
        x, y, rowH = 0, y + rowH, 0
      end
      c.sx, c.sy = x, y
      x = x + c.w
      if x > sw then sw = x end
      if y + c.h > sh then sh = y + c.h end
      if c.h > rowH then rowH = c.h end
    end

    -- pass two, draw. only one icon and the sheet are live at a time
    local bmp = Bitmap(sw, sh, PixelFormat.Format32bppArgb)
    local g = Graphics.FromImage(bmp)
    local n = 0
    for _, id in ipairs(order) do
      local c = metas[id]
      withIcon(c.file, function(frame, rect)
        g:TranslateTransform(c.sx, c.sy)
        t_IGifFrame.Draw(frame, g, rect)
        g:ResetTransform()
        return true
      end)
      n = n + 1
      if n % 200 == 0 then sweep() end
    end
    g:Dispose()
    bmp:Save(sheetPath(ci), ImageFormat.Png)
    bmp:Dispose()

    -- this chunk's slice of the index, merged into one file at the end
    local parts, named = {}, 0
    table.sort(order)
    for _, id in ipairs(order) do
      local c = metas[id]
      local nm = NAMES[id]
      if nm then named = named + 1 end
      table.insert(parts, '{'
        .. q('id') .. ':' .. string.format('%d', id) .. ','
        .. q('name') .. ':' .. q(nm or '') .. ','
        .. q('cash') .. ':' .. (c.cash and 'true' or 'false') .. ','
        .. q('s') .. ':' .. string.format('%d', ci) .. ','
        .. q('x') .. ':' .. string.format('%d', c.sx) .. ','
        .. q('y') .. ':' .. string.format('%d', c.sy) .. ','
        .. q('w') .. ':' .. string.format('%d', c.w) .. ','
        .. q('h') .. ':' .. string.format('%d', c.h) .. '}')
    end
    File.WriteAllText(partPath(ci), table.concat(parts, ','))
    say(string.format('   wrote %d icons, %d named, sheet %dx%d, %.0f MB',
      n, named, sw, sh, memMB()))
    sweep()
    ::nextChunk::
  end

  -- every chunk is on disk, so stitch them into the file the app reads
  local all, sheetNames, missing = {}, {}, 0
  for ci = 0, nChunks - 1 do
    if File.Exists(partPath(ci)) then
      local txt = File.ReadAllText(partPath(ci))
      if txt ~= '' then
        table.insert(all, txt)
        table.insert(sheetNames, q(string.format('%s-icons-%d.png', folder.name, ci)))
      end
    else
      missing = missing + 1
    end
  end
  if missing > 0 then
    say(string.format('%s: %d of %d chunks still to do, run again',
      folder.name, missing, nChunks))
  elseif #all == 0 then
    -- every chunk ran and none of them found an icon, so this folder does not
    -- store one. Hair and Face are like that: the game draws their sprite as
    -- the icon rather than keeping a separate image
    --
    -- deliberately no json, because an empty one reads as "done" and would
    -- quietly leave the tab with no icons at all
    say(string.format('%s: NO ICONS STORED, needs generating from the sprite',
      folder.name))
    File.WriteAllText(Path.Combine(OUT, folder.name .. '.json'),
      '{' .. q('sheets') .. ':[' .. table.concat(sheetNames, ',') .. '],'
      .. q('items') .. ':[' .. table.concat(all, ',') .. ']}')
    say(string.format('%-10s complete, %d chunk(s)', folder.name, nChunks))
  end
  sweep()
  ::nextFolder::
end

say('done')
env:WriteLine('log at ' .. LOG)
