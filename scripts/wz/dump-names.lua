-- dumps every equip name to json, keyed by id
--
-- run from LuaConsole with Base.wz loaded
--
-- extract-index.lua already reads these, but it only writes the ones belonging
-- to a folder that produced icons. Hair and Face produce none, because the game
-- draws their sprite as the icon rather than storing one, so their names never
-- reached disk. this puts all of them somewhere node can read, and then
-- build-sprite-icons.mjs can build those two tabs without touching wz at all

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'System'
import 'System.IO'

local OUT = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-out\\index\\names.json'

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

local function q(s)
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"')
    :gsub('\r', ' '):gsub('\n', ' '):gsub('\t', ' ') .. '"'
end

local eqp = resolve('String/Eqp.img') or resolve('Eqp.img')
if not eqp then
  env:WriteLine('no String/Eqp.img, is Base.wz loaded?')
  return
end

local root = child(eqp, 'Eqp') or eqp
local parts, n = {}, 0
for category in each_node(root) do
  for item in each_node(category) do
    local id = tonumber(textOf(item) or '')
    local nameNode = child(item, 'name')
    if id and nameNode and nameNode.Value ~= nil then
      n = n + 1
      table.insert(parts, q(string.format('%d', id)) .. ':' .. q(tostring(nameNode.Value)))
    end
  end
end

File.WriteAllText(OUT, '{' .. table.concat(parts, ',') .. '}')
env:WriteLine(string.format('%d names written to %s', n, OUT))
