# Stage 16 — Physical-fit and pilotable feedback loop

The **Graybox Builder** (`graybox.html`) is the ten-reference silhouette workshop. The original `index.html` detailed assembly lab remains an independent serial-owned subsystem laboratory.

## Implemented now

1. **Live Test Yard handoff:** `PILOT IN TEST YARD` validates the whole five-station graybox, validates corresponding production load/power/graph requirements, records only the Test Yard sandbox preset, and opens the real M3CH4 Test Yard. The companion live-game change installs constructor-tagged presets atomically and offers a **CONSTRUCTOR** return link. This gives actual game movement, cockpit and firing for the live counterpart.
2. **Physical contact measurements:** `grayboxPhysicalAudit.js` probes actual visible world-space meshes near each proposed connection and verifies the mobile module reaches the ground. Reports appear on the whole-machine assessment. Unlike graph parenting, this catches visually unsupported assemblies. This broad-phase test is *not* triangle-accurate penetration or swept-motion clearance.
3. **Child-owned mating faces:** `grayboxMatingFaces.js` defines actual local contact points, normal directions and contact depths for the source-backed cabs, direct guns and power units, plus the prototype bubble canopy. `grayboxVisual.js` joins these faces to the frame's authored receivers independent of the outer armor AABB. It keeps barrels forward and allows either-side trunnion mating without a backward-pointed gun.
4. **Ten reference recipes:** Existing `recipe(0..9)` continue to be built from the same catalogue. Unit tests verify socket facing on all ready direct assemblies and preserve those individual silhouettes.
5. **Isolation:** Constructor blueprints remain stored under `m3ch4-graybox-v1` and are never converted into career saves.

## Intentionally not misrepresented as complete

- The live game renders the closest **production** five-station machine, not the experimental Graybox meshes. The live builder has no equivalent for `mobility-low-gb`, `mobility-quad-gb`, `cab-bubble-gb`, and `frame-spire-gb`; explicit substitutions are disclosed before launch. All prototype-only housings, armor, mounts, supporting attachments and paint remain intact in Graybox.
- Full runtime export of arbitrary per-joint physical hierarchies, exact collision detection, dynamic bracing/torque and walking for the four-leg crawler are separate integration work.
- Some direct surfaces (e.g. an unported air generator and two-link weapon carrier) still use Stage 15 visual placement; these are **fallbacks**, not certified joints. Inspection flags suspicious gaps rather than inventing geometry to hide them.
- Measured contact between two mesh bounds does not prove they are attached with a real bolt/bracket. The final acceptance test remains assembled-model visual review at multiple angles and under animation.

## Manual acceptance checks

Open `graybox.html`, load a reference, and inspect all five sides at bare/armored/encased coverage. Watch the **MEASURED CONTACT** report. Change armor and confirm the cab and gun do not shift because their covering expanded. Change a weapon from right to left and verify it still aims forward. Deploy a supported configuration, move and fire in Test Yard, then return with **CONSTRUCTOR** and confirm the exact experimental appearance and support placements are still saved. Test substitute prototypes separately and verify the deployment dialog names the substitutes.

Do not regard a passing geometry-contact score as sufficient for dynamic clearance; it is one measurable check alongside the Part Audit, joint sweeps and subjective full-rig inspection.
