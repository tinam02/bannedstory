-- which visual slot does each layer sit in, and why did hairShade vanish
--
-- run from LuaConsole with Base.wz loaded
--
-- a hat declares vslot CpH1H5, meaning it takes those slots over from whatever
-- else claims them. the hair claims H1H2H3H4H5H6HfHsHb. so the hat should
-- suppress two of the hair's layers, which is why hair currently draws over it
--
-- what's missing is layer name -> slot code. smap.img should be that mapping

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

------------------------------------------------------------

env:WriteLine('==== smap.img ====')
local smap = resolve('Base/smap.img') or resolve('smap.img')
if not smap then
  env:WriteLine('  not at Base/smap.img. try the tree for anything named smap')
else
  local n = 0
  for c in each_node(smap) do
    n = n + 1
    env:WriteLine(string.format('  %-34s %s', c.Text, tostring(c.Value)))
  end
  env:WriteLine('  ' .. string.format('%d', n) .. ' entries')
end

------------------------------------------------------------
-- hairShade never made it into the dump. find out where it falls over

env:WriteLine('==== hairShade ====')
local raw = resolve('Character/Hair/00030000.img/stand1/0/hairShade')
if not raw then
  env:WriteLine('  no such node')
else
  env:WriteLine('  raw: ' .. tostring(raw.Value))
  local ok, got = pcall(function() return Wz_NodeExtension.ResolveUol(raw) end)
  if not ok or got == nil then
    env:WriteLine('  ResolveUol failed, so the dump skipped it')
  else
    env:WriteLine('  resolved -> ' .. tostring(got.FullPath))
    local kids = 0
    for f in each_node(got) do
      kids = kids + 1
      env:WriteLine('    ' .. f.Text .. ' = ' .. tostring(f.Value))
    end
    if kids == 0 then
      env:WriteLine('    (no children, so no origin, which is why it was skipped)')
    end
  end
end

------------------------------------------------------------
-- the hair's own layers, to match against the slot codes above

env:WriteLine('==== hair layers in stand1/0 ====')
local hair = resolve('Character/Hair/00030000.img/stand1/0')
if hair then
  for c in each_node(hair) do
    local got = c
    local ok, r = pcall(function() return Wz_NodeExtension.ResolveUol(c) end)
    if ok and r ~= nil then got = r end
    local z = child(got, 'z')
    env:WriteLine('  ' .. c.Text .. '  z=' .. tostring(z and z.Value or '?'))
  end
end

env:WriteLine('======== done ========')
