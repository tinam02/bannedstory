-- names the chat balloon and name tag styles from the rings that grant them
--
-- run it from the LuaConsole plugin in WzComparerR2, with Base.wz loaded
--
-- the ring stores the style index directly:
--   Character/Ring/0111xxxx.img/info/chatBalloon
--   Character/Ring/0111xxxx.img/info/nameTag
--
-- rings are equips, so they live in Character.wz. an earlier pass over Item.wz
-- found nothing for exactly that reason, and the id arithmetic it fell back on
-- (style N = item 1115000+N) was wrong. ring 1115020 is chat balloon 182, not 20

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'
import 'System.IO'

------------------------------------------------------------

local OUT_ROOT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\public\\ui'

-- where equips live. Ring holds every chat and label ring. widen this if the
-- coverage printed at the end looks short
local FOLDERS = { 'Ring', 'Accessory' }

local STRINGS = { 'Eqp', 'Cash', 'Consume', 'Ins', 'Etc' }

-- info field -> which set it names
local FIELDS = {
  { field = 'chatBalloon', set = 'balloons' },
  { field = 'nameTag', set = 'nametags' },
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

------------------------------------------------------------
-- id -> name across String.wz

local names = {}
local total = 0

local function indexNames(node)
  local nm = child(node, 'name')
  if nm and nm.Value ~= nil then
    names[node.Text] = tostring(nm.Value)
    total = total + 1
    return
  end
  for c in each_node(node) do indexNames(c) end
end

env:WriteLine('==== indexing String.wz ====')
for _, s in ipairs(STRINGS) do
  local root = resolve('String/' .. s .. '.img')
  if root then
    for c in each_node(root) do indexNames(c) end
  end
end
env:WriteLine('  ' .. string.format('%d', total) .. ' named items')

------------------------------------------------------------

local out = { balloons = {}, nametags = {} }
local counts = { balloons = 0, nametags = 0 }
local clashes = 0

env:WriteLine('==== scanning Character.wz for rings ====')
for _, folder in ipairs(FOLDERS) do
  local root = resolve('Character/' .. folder)
  if not root then
    env:WriteLine('  no Character/' .. folder)
  else
    local imgs, found = 0, 0
    for imgNode in each_node(root) do
      local img = resolve('Character/' .. folder .. '/' .. imgNode.Text)
      if img then
        imgs = imgs + 1
        local info = child(img, 'info')
        if info then
          for _, f in ipairs(FIELDS) do
            local node = child(info, f.field)
            if node and node.Value ~= nil then
              local styleId = tonumber(tostring(node.Value))
              -- 01112252.img -> 1112252
              local itemId = tonumber((imgNode.Text:gsub('%.img$', '')))
              if styleId and itemId then
                local key = string.format('%d', styleId)
                local nm = names[string.format('%d', itemId)]
                if nm then
                  if out[f.set][key] and out[f.set][key] ~= nm then
                    clashes = clashes + 1
                  end
                  -- first one wins, later rings tend to be re-releases
                  if not out[f.set][key] then
                    out[f.set][key] = nm
                    counts[f.set] = counts[f.set] + 1
                  end
                end
                found = found + 1
              end
            end
          end
        end
      end
    end
    env:WriteLine(string.format('  %-10s %d imgs, %d with a style id', folder, imgs, found))
  end
end

env:WriteLine('  ' .. string.format('%d', clashes) .. ' style ids claimed by more than one ring')

------------------------------------------------------------

local function q(s)
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"'):gsub('\n', ' ') .. '"'
end

for _, set in ipairs({ 'balloons', 'nametags' }) do
  local parts, shown = {}, 0
  for k, v in pairs(out[set]) do
    table.insert(parts, q(k) .. ':' .. q(v))
    if shown < 8 then
      env:WriteLine(string.format('  %s %-5s %s', set, k, v))
      shown = shown + 1
    end
  end

  local path = Path.Combine(OUT_ROOT, set .. '\\names.json')
  File.WriteAllText(path, '{' .. table.concat(parts, ',') .. '}')
  env:WriteLine('  ' .. set .. ': named ' .. string.format('%d', counts[set])
    .. ' styles -> ' .. path)
end

env:WriteLine('======== done ========')
