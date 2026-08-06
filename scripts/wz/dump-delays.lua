-- dumps the real per frame timing for every stance
--
-- run from LuaConsole with Base.wz loaded. seconds, not hours: it reads two imgs
--
-- extract-avatar.lua never read `delay`, so the manifests carry no timing and
-- the app animates on a flat guess. one flat number cannot be right for both:
-- walking is about 180ms a frame and the stand1 idle breathe is several times
-- slower, so whichever you pick, one of them looks wrong.
--
-- the body is the only item worth reading for stances. every part of a stance
-- has to share its timing or the character would come apart while it played, so
-- the body's delays are the stance's delays.
--
-- the face is separate. it blinks on its own schedule in game rather than
-- keeping time with the legs, so its expressions are dumped alongside

import 'WzComparerR2.PluginBase'
import 'WzComparerR2.WzLib'
import 'System'
import 'System.IO'

local DIR = 'C:\\TINA\\CODE\\bannedstory\\bannedstory\\.avatar-out\\'

-- the body drives every stance, and a face drives every expression. two files
-- because the app runs them on separate clocks: the face blinks on its own
-- schedule in game, it does not keep time with the legs
local JOBS = {
  { path = 'Character/00002000.img', out = DIR .. 'delays.json' },
  { path = 'Character/Face/00020000.img', out = DIR .. 'face-delays.json' },
}

-- wz leaves delay off a frame that uses the default
local DEFAULT_MS = 180

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

local function q(s) return '"' .. tostring(s) .. '"' end

for _, job in ipairs(JOBS) do
local img = resolve(job.path)
if not img then
  env:WriteLine('no ' .. job.path .. ', is Base.wz loaded?')
  goto nextJob
end

local parts = {}
for stance in each_node(img) do
  local name = textOf(stance)
  if name and name ~= 'info' then
    -- frames are numbered, and they have to come out in order
    local idxs = {}
    for frameNode in each_node(stance) do
      local n = tonumber(textOf(frameNode) or '')
      if n then table.insert(idxs, n) end
    end
    table.sort(idxs)

    if #idxs > 0 then
      local list = {}
      for _, i in ipairs(idxs) do
        local frameNode = child(stance, string.format('%d', i))
        local d = frameNode and child(frameNode, 'delay')
        local ms = DEFAULT_MS
        if d and d.Value ~= nil then
          -- wz writes a negative delay for a frame that holds, take the size
          ms = math.abs(tonumber(tostring(d.Value)) or DEFAULT_MS)
        end
        table.insert(list, string.format('%d', ms))
      end

      -- anything sitting beside the numbered frames, reported rather than
      -- assumed. a plain loop snaps from the last frame back to the first, and
      -- the idle stances clearly do not do that in game, so something here
      -- should say whether a stance bounces or cycles. `zigzag` is the name to
      -- look for
      local extras = {}
      for n in each_node(stance) do
        local t = textOf(n)
        if t and not tonumber(t) then
          local v = ''
          local ok = pcall(function()
            if n.Value ~= nil then v = '=' .. tostring(n.Value) end
          end)
          table.insert(extras, q(t .. v))
        end
      end

      table.insert(parts, q(name) .. ':{'
        .. q('delays') .. ':[' .. table.concat(list, ',') .. '],'
        .. q('extras') .. ':[' .. table.concat(extras, ',') .. ']}')
    end
  end
end

File.WriteAllText(job.out, '{' .. table.concat(parts, ',') .. '}')
env:WriteLine(string.format('%d entries from %s -> %s', #parts, job.path, job.out))

-- printed as well as written, since the interesting part is what turns up in
-- `extras` and that is easier to read here than in the json
for _, p in ipairs(parts) do env:WriteLine('  ' .. p) end
::nextJob::
end
