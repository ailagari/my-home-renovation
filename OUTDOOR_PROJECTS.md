# Exterior points, emergency equipment and house-model projects

Open the [live design studio](https://ailagari.github.io/my-home-renovation/studio.html).
This release adds exterior mounting surfaces, an emergency-equipment checklist,
switch assignment and separate projects using imported house models.

## Exterior and compound walls

Choose **Ground · Exterior house walls**, **First · Exterior house walls** or
**Ground · Compound walls** from the area selector. Select a named wall face
under **Add onto**, or use **Pick surface in 3D**. Add a light, camera, socket,
intercom or other item, place it and finish placement. **Drag fixtures** and
the inspector's along-wall offset and mounting height change its location.

The exterior catalogue follows 22 traced facade segments. Compound faces include
both inside and outside faces of the three measured/assumed boundary sides,
split around the gate opening. No rear boundary is invented. The wall-elevation
drawing shows the selected face and its points. Positions over the modelled
windows are flagged; actual hardware size and site clearances still need checking.

Bound compound points follow their selected wall when setbacks or gate settings
change. Offsets/heights are clamped if the wall becomes smaller. Existing outdoor
points from earlier versions remain unbound at their original positions; move
them to the new wall areas in the inspector to bind them.

Ground-floor power goes to the selected ground DB, upper-floor power to its DB,
and data/PoE connections to the selected rack. Routing, schedules, drawings and
material estimates update from the same coordinates. Compound routes use the
existing underground allowance, not a surveyed cable trench design.

## Inverter selection and switch assignment

The top strip shows **Total inverter load**. Select **Choose emergency equipment**
or **06 · Inverter & switches** to open the searchable checklist. Tick an item to
include it on the inverter. Loads sharing a control channel change supply
together. The network-rack row includes its attached PoE loads once.

In the same workspace, choose **Switchboards & equipment**, select a switch,
then tick compatible equipment. The assigned count and watts are visible above
the list. Search/filter by room, assign compatible matching items, clear a
switch, create a switch or locate it in 3D. Incompatible choices show a reason.
One station remains one logical control channel; separate channels are needed
for independent controls, different supplies and different circuit groups.
Multiple switch locations can control the same load. Connections specify the
desired control relationship, not terminal wiring.

Inverter totals are entered connected watts, before diversity. They do not
calculate battery runtime, starting surge, transfer arrangements or inverter
sizing. Change example ratings to the actual equipment ratings.

## Saved projects and a new house file

Open **07 · Projects & house model** to rename the current project, save a
separate copy, open an existing project, or start an empty design. Inactive
projects can be archived and restored. Your current project is saved before
switching. Each project keeps its equipment, materials, furniture layout,
switch links, floor levels and model references.

For another house, expand **New project from a 3D house file**. Choose GLB/glTF,
FBX, STL or OBJ, with local BIN/textures where required. Set file units, Y/Z up,
an optional measured overall width and the first-floor level. GLB/glTF best
preserves materials; lintels, beams and other details must exist in the file.
The existing 30 MB/model and 1.5-million-vertex limits apply.

The imported model replaces the original traced house in that project's 3D
workspace. Confirm scale, orientation, alignment and levels before placing
equipment. Ground is the 0 m reference; first-floor elevation and both clear
heights are editable. Each floor has an editing plane. Pick actual mesh faces
for equipment, or choose the defined ceiling/floor plane. Add a DB on each
floor and a rack before relying on the route estimates.

**Full house model** shows the entire reference geometry at its real floor
levels. **Separate floor views** returns to the electrical overview. Currently
two electrical floors are supported; additional storeys are visible reference
geometry. Rooms, lintels and structure are not automatically classified.
Furniture inside a house file is part of that reference mesh, rather than an
independently movable library item.

Imported-house floor drawings show the floor workspace bounds and equipment
coordinates. Floor-finish allowances use rectangular model bounds; they are
not net room/slab areas or a structural material takeoff. The model does not
perform beam/lintel clash detection or validate concealed routing.

## Portable backups

**Export project** prepares a backup including the original imported model
files. Choose **Save project JSON**, or, in the offline viewer, **Save to local
exports folder**. The latter writes a new file inside `house-viewer/exports`
without replacing older backups. The in-app browser may not hand off standard
downloads; use this local save button there. Small backups also expose a
read-only JSON field for copying.

**Import** restores the project and embedded model files. A project with the
same saved project ID updates that project; use **Save as a separate copy**
first if you need both versions. Browser/site data deletion can remove saved
projects and model files. Localhost, GitHub Pages and other browsers/devices
have separate storage. Nothing is synced to GitHub automatically.

## Verification

Run `node verify-outdoor-projects.mjs` alongside the three existing verification
scripts. Checks cover mounted coordinates, gate gaps, window warnings, floor
DB/rack routing, wall elevations, emergency control groups, source compatibility,
custom floor heights and independent project storage. Browser tests cover
compound-light placement and wattage, switch assignment, an imported synthetic
house with lintels, mesh-face placement, floor-level editing, local backup
byte equality, restoration under a fresh model ID, and invalid-import recovery.
