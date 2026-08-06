-- follow the UOLs, so we can read the anchors behind them
--
-- run from LuaConsole with Base.wz loaded
--
-- the first pass showed the shape we need: every layer has an origin, a `map`
-- of named anchors, and a z name that zmap ranks. body/arm gave theirs up
-- directly, but head, hair and hat are Wz_Uol references and printed as the
-- reference rather than the target
--
-- i don't know which resolve call WzComparerR2 exposes, so this tries the
-- candidates and reports which one works instead of picking one blind

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'WzComparerR2.Common'

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

------------------------------------------------------------
-- try every way of following a link that might exist, report which lands

local function tryResolve(node)
  local attempts = {
    {
      'Wz_NodeExtension.ResolveUol',
      function() return Wz_NodeExtension.ResolveUol(node) end,
    },
    {
      'Wz_NodeExtension.GetLinkedSourceNode',
      function() return Wz_NodeExtension.GetLinkedSourceNode(node, findNodeFunc) end,
    },
    {
      'node:GetLinkedSourceNode',
      function() return node:GetLinkedSourceNode(findNodeFunc) end,
    },
    {
      'node.Value.HandleUol',
      function() return node.Value:HandleUol(node) end,
    },
    -- if none of the above bind, the raw string is enough to walk by hand
    {
      'node.Value.Uol (string)',
      function() return node.Value.Uol end,
    },
  }

  for _, a in ipairs(attempts) do
    local ok, got = pcall(a[2])
    if ok and got ~= nil then
      return a[1], got
    end
  end
  return nil, nil
end

local function val(node)
  if not node or node.Value == nil then return nil end
  local ok, x = pcall(function() return node.Value.X end)
  if ok and x ~= nil then
    return string.format('(%d,%d)', node.Value.X, node.Value.Y)
  end
  local s = tostring(node.Value)
  if s:find('Wz_Png') then return 'canvas' end
  if s:find('Wz_Uol') then return 'uol' end
  return s
end

-- prints a layer's origin / z / map, which is everything compositing needs
local function dumpLayer(node, indent)
  local parts = {}
  for f in each_node(node) do
    if f.Text == 'map' then
      local anchors = {}
      for a in each_node(f) do
        table.insert(anchors, a.Text .. (val(a) or ''))
      end
      table.insert(parts, 'map{' .. table.concat(anchors, ' ') .. '}')
    else
      local v = val(f)
      table.insert(parts, f.Text .. (v and ('=' .. v) or ''))
    end
  end
  if #parts == 0 then
    env:WriteLine(indent .. '(no children)')
  else
    env:WriteLine(indent .. table.concat(parts, '  '))
  end
end

------------------------------------------------------------

local TARGETS = {
  { 'head', 'Character/00012000.img/stand1/0/head' },
  { 'hair', 'Character/Hair/00030000.img/stand1/0/hair' },
  { 'hairOverHead', 'Character/Hair/00030000.img/stand1/0/hairOverHead' },
  { 'hat', 'Character/Cap/01002140.img/stand1/0/default' },
}

for _, t in ipairs(TARGETS) do
  env:WriteLine('==== ' .. t[1] .. '  ' .. t[2] .. ' ====')
  local node = resolve(t[2])
  if not node then
    env:WriteLine('  not found')
  else
    env:WriteLine('  raw value: ' .. tostring(node.Value))
    local how, got = tryResolve(node)
    if not how then
      env:WriteLine('  NOTHING RESOLVED, none of the calls bound')
    else
      env:WriteLine('  resolved via ' .. how)
      env:WriteLine('  -> ' .. tostring(got))
      -- if it came back as a node we can read its layer data straight off
      local ok = pcall(function() return got.Nodes end)
      if ok then
        env:WriteLine('  full path: ' .. tostring(got.FullPath))
        dumpLayer(got, '    ')
      end
    end
  end
end

------------------------------------------------------------
-- an equip's info decides slot occupancy, which is what stops a hat and a hair
-- both claiming the head

env:WriteLine('==== hat info ====')
local info = resolve('Character/Cap/01002140.img/info')
if info then
  for f in each_node(info) do
    local v = val(f)
    env:WriteLine('  ' .. f.Text .. (v and (' = ' .. v) or ''))
  end
end

env:WriteLine('======== done ========')
