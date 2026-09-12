# Visual electrical editor

Open [the design studio](https://ailagari.github.io/my-home-renovation/studio.html).
Edits stay in your browser; export project JSON to back up or transfer your design.

## Place hardware

1. Choose the room above the model.
2. Use **Add onto** to choose a wall, ceiling or floor. Alternatively, use
   **Pick surface in 3D**, then click a surface in the selected room.
3. Click **+** beside an item in the equipment library. It appears as generic
   sample hardware. Click its intended position, then **Finish placing**.
4. Use **Drag fixtures** to move an item directly along its mounting surface.
   Positions snap to 50 mm during dragging. Numeric fields allow finer offsets.
5. Use the inspector to change its room, surface, height, quantity and actual
   connected watts. Height AFF means above finished floor.

The library includes lights, fans, AC, 13A/16A sockets, 13A/16A appliances,
single and dual RJ45 outlets, a network rack, single-phase and three-phase
DBs, switches, plus the earlier kitchen, AV, CCTV and plumbing provisions.
Marked socket/appliance ratings do not calculate or certify circuit capacity.
Dedicated 13A/16A socket items start at zero watts; enter the connected load
without counting the same appliance twice.

## Sources

**Sources & calculation settings** selects the ground-floor DB, first-floor
DB and network rack. Locate buttons select their hardware in the model.
Power endpoints return to their own floor's selected DB; data endpoints
return to the selected rack. Moving a source updates its routes and estimates.
A rack's own power point returns to the DB on the rack's floor and includes
its base equipment watts plus attached PoE watts.

Adding a DB selects it as the primary DB on that floor. Adding a rack selects
it as the data source. Earlier enclosures remain placed and counted; remove
unneeded ones or choose the intended primary source. Deleting a selected
source leaves its routes unresolved until a replacement is selected.

Single-phase DBs use their chosen R/Y/B phase. Three-phase DBs use provisional
load balancing, with essential circuits provisionally on R. A single-phase
ground DB cannot supply a three-phase upper DB; that feeder is flagged and
excluded until the supply arrangement is resolved.

## Switches

Select a load and use **Add a switch for this load**, or select an existing
switch and tick its controlled loads. Choose another room in the load filter
if needed. A switch can control several compatible loads, and a load can
have multiple switch locations.

Each placed switch station represents one logical control channel. Linked
loads must use the same floor DB, normal/essential supply and compatible
final-circuit group. Dedicated appliances remain separate. Incompatible
links or edits are rejected; use separate control channels for other circuits.

Links describe the requested behaviour. They do not specify terminal
connections, two-way/intermediate switches, relay wiring, or safe transfer
arrangements. **Control conductor cores per link** defaults to zero
(unassigned), excluding those conductors from the wire total. An engineer
may enter an allowance after selecting the control system; this still does
not constitute a terminal wiring diagram.

## Drawings and handover

- **Drawings**: electrical floor plans, ceiling points, selected-room wall
  elevations and a live DB/circuit diagram; download SVG.
- **Circuits & routes**: source, phase and circuit group schedules, and the
  many-to-many switch/load schedule; export CSV.
- **Material estimate**: hardware counts and route-based conductor, conduit,
  data-cable and floor-finish allowances; export CSV.
- **Engineer pack**: a standalone HTML document with both floors, ceiling
  sheets, point/source/circuit/control schedules, BOM, route coordinates and
  unresolved items. Open the downloaded file and print/save as PDF.
- **Export project / Import**: preserve equipment, sources, switch links and
  materials as JSON. Edits are browser-local and do not sync between localhost,
  GitHub Pages, browsers or devices.

The main house review now reads the editor's saved design for electrical
and network drawings, and displays saved hardware in proposed 3D views.
An open review tab updates when the editor saves. Plumbing remains a baseline
proposal and fixture count; no plumbing pipe network is inferred.

## Scope of the outputs

Geometry is traced from the supplied plan. Hardware is a generic visual
reference; manufacturer dimensions, clashes and mounting clearances need
verification. The 3 m floor height is interpreted floor-to-floor, with a
provisional 2.84 m clear ceiling. Measured site geometry is still required.

Wire/conduit lengths are independent orthogonal route allowances with slack
and waste. Shared conduits, fill, bends, pull boxes, structural clashes,
protective devices, conductor capacity/voltage drop, earthing, backup topology,
control terminals and installation compliance require professional design.
The documents are for engineering coordination, not construction release.

## Verification

Run `node verify-visual-electrical.mjs` from this repository.
Tests cover source routing by floor, DB phase selection, rack relocation,
RJ45 run counts, PoE power accounting, many-to-many controls without load
duplication, compatible circuit merging, rejected cross-supply links, deletion,
source movement, route arithmetic, waste, migration, JSON round-trips and
generated schedules. Browser checks cover ceiling hardware, numeric placement,
dragging, switch linking, drawing views, export and the live main review.
