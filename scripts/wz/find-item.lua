-- finds equip items by name, and prints their ids
--
-- run from LuaConsole with Base.wz loaded, same as the others
--
-- names are not in Character.wz, they live in String.wz/Eqp.img. opening
-- String.wz on its own has never worked here, but Base.wz indexes it, so
-- FindWz reaches it by path without the file being opened separately
--
-- the layout is Eqp.img/Eqp/<category>/<id>/name, where category is Cap,
-- Longcoat, Shoes and so on, which is close enough to our extraction folders

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'System'
import 'System.IO'

------------------------------------------------------------

-- what to look for, case insensitive substring. empty lists everything, which
-- is tens of thousands of lines, so probably don't
local SEARCH = 'heartthrob'

-- also write the hits here, since the console scrolls
local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-out\\found.txt'

------------------------------------------------------------

local function say(s)
  env:WriteLine(s)
  pcall(function() File.AppendAllText(OUT, s .. string.char(13, 10)) end)
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

------------------------------------------------------------

pcall(function() File.WriteAllText(OUT, '') end)

local eqp = resolve('String/Eqp.img') or resolve('Eqp.img')
if not eqp then
  say('no String/Eqp.img. is Base.wz loaded?')
  return
end

local root = child(eqp, 'Eqp') or eqp
local needle = SEARCH:lower()
local hits, scanned = 0, 0

say('searching for "' .. SEARCH .. '"')

for category in each_node(root) do
  local cat = textOf(category) or '?'
  for item in each_node(category) do
    scanned = scanned + 1
    local id = textOf(item)
    local nameNode = child(item, 'name')
    local name = nameNode and nameNode.Value and tostring(nameNode.Value) or nil
    if name and (needle == '' or name:lower():find(needle, 1, true)) then
      hits = hits + 1
      say(string.format('  %-12s %-10s %s', cat, id or '?', name))
    end
  end
end

say(string.format('%d hits out of %d equips', hits, scanned))
say('written to ' .. OUT)
