-- how big would a full avatar extraction actually be
--
-- run from LuaConsole with Base.wz loaded. counts only, writes nothing
--
-- the size question is really "how many unique canvases per item". wz leans on
-- uol and _outlink hard, a hat had one canvas serving all 35 stances, so
-- stances x frames is the wrong way to think about it
--
-- samples rather than walking everything, because 40k items resolved node by
-- node would take all day. bump SAMPLE if the numbers look unstable

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'

local SAMPLE = 20

-- Coat is a top, Longcoat an overall. Weapon is in there because it's the one
-- kind we've never dumped and could behave differently
local FOLDERS = {
  'Cap', 'Coat', 'Longcoat', 'Pants', 'Shoes', 'Glove', 'Cape',
  'Face', 'Hair', 'Weapon', 'Accessory',
}

local function each_node(node)
  return coroutine.wrap(function()
    for _, n in each(node.Nodes) do coroutine.yield(n) end
  end)
end

local function resolve(path)
  local node = PluginManager.FindWz(path)
  if not node then return nil end
  local img = Wz_NodeExtension.GetNodeWzImage(node)
  if img and not img.Extracted then img:TryExtract() end
  return PluginManager.FindWz(path)
end

local function deref(node)
  local ok, got = pcall(function() return Wz_NodeExtension.ResolveUol(node) end)
  if ok and got ~= nil then return got end
  return node
end

-- every canvas in the game, keyed so the same pixels counted twice only land
-- once. that's the whole point, a shared canvas costs nothing extra
local globalSeen = {}
local globalCanvases, globalPx = 0, 0

-- walks one item, returns how many distinct canvases it needs and their area
local function measure(img)
  local seen = {}
  local canvases, px = 0, 0

  local function walk(node, depth)
    if depth > 5 then return end
    for raw in each_node(node) do
      if raw.Text ~= 'info' then
        local c = deref(raw)
        local isPng = c and c.Value ~= nil
          and tostring(c.Value):find('Wz_Png') ~= nil

        if isPng then
          -- _outlink means the bytes live elsewhere and are shared, so key on
          -- that when it's there
          local key = tostring(c.FullPath)
          for f in each_node(c) do
            if f.Text == '_outlink' or f.Text == '_inlink' then
              key = tostring(f.Value)
            end
          end

          if not seen[key] then
            seen[key] = true
            canvases = canvases + 1
            local ok, w = pcall(function() return c.Value.Width end)
            local ok2, h = pcall(function() return c.Value.Height end)
            if ok and ok2 and w and h then px = px + (w * h) end

            if not globalSeen[key] then
              globalSeen[key] = true
              globalCanvases = globalCanvases + 1
              if ok and ok2 and w and h then globalPx = globalPx + (w * h) end
            end
          end
        elseif c then
          walk(c, depth + 1)
        end
      end
    end
  end

  local ok = pcall(walk, img, 1)
  if not ok then return 0, 0 end
  return canvases, px
end

------------------------------------------------------------

-- measured off the spike's own output
local BYTES_PER_PX = 0.676

env:WriteLine('folder      items  sampled  canvases/item   px/item   KB/item   est total')
env:WriteLine(string.rep('-', 78))

local grandItems, grandKb = 0, 0

for _, folder in ipairs(FOLDERS) do
  local root = resolve('Character/' .. folder)
  if not root then
    env:WriteLine(string.format('%-11s  (no Character/%s)', folder, folder))
  else
    local all = {}
    for c in each_node(root) do table.insert(all, c.Text) end

    -- spread the sample across the whole range, old items and new
    local step = math.max(1, math.floor(#all / SAMPLE))
    local canvases, px, n = 0, 0, 0
    local i = 1
    while i <= #all and n < SAMPLE do
      local img = resolve('Character/' .. folder .. '/' .. all[i])
      if img then
        local c, p = measure(img)
        if c > 0 then
          canvases = canvases + c
          px = px + p
          n = n + 1
        end
      end
      i = i + step
    end

    if n == 0 then
      env:WriteLine(string.format('%-11s %6d  nothing measurable', folder, #all))
    else
      local perItem = canvases / n
      local pxItem = px / n
      local kbItem = pxItem * BYTES_PER_PX / 1024
      local totalMb = kbItem * #all / 1024
      grandItems = grandItems + #all
      grandKb = grandKb + kbItem * #all
      env:WriteLine(string.format('%-11s %6d %8d %14.1f %9.0f %9.1f %8.0f MB',
        folder, #all, n, perItem, pxItem, kbItem, totalMb))
    end
  end
end

------------------------------------------------------------
-- the skins are the expensive ones, real art per stance and frame

env:WriteLine(string.rep('-', 78))
for _, id in ipairs({ '00002000.img', '00012000.img' }) do
  local img = resolve('Character/' .. id)
  if img then
    local c, p = measure(img)
    env:WriteLine(string.format('%-11s %6s %8s %14d %9d %9.1f',
      id, '-', '1', c, p, p * BYTES_PER_PX / 1024))
  end
end

env:WriteLine(string.rep('-', 78))
env:WriteLine(string.format('sampled items across those folders: %d', grandItems))
env:WriteLine(string.format('estimated total: %.2f GB', grandKb / 1024 / 1024))
env:WriteLine(string.format('unique canvases actually seen: %d, %.0f MB of pixels',
  globalCanvases, globalPx * BYTES_PER_PX / 1024 / 1024))
env:WriteLine('======== done ========')
