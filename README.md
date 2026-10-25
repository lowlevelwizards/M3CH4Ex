# M3CH4Ex — Universal Construction Laboratory

Independent, experimental modular-mech construction workspace. The original M3CH4 game and its saves are unaffected.

## Open on your phone

GitHub Pages publishes the experimental `main` branch independently from the live game. Open:

https://lowlevelwizards.github.io/M3CH4Ex/

The root `index.html` is the white construction studio; it is not the combat game.

## Current experimental scope

- White sterile 3D workspace with orbit, pinch-zoom, two-finger pan and camera presets
- Existing M3CH4 catalogue modules and production-authored visuals where available
- A few explicitly labeled envelope proxies for unmigrated individual part visuals
- Existing five-station assembly swaps, graph-based structural inspection, visible sockets, H2/U1 adapter and generator outrigger
- **Stage 06**: independently owned left/right Yardwalker legs with real authored hip connections
- **Stage 07**: six serviceable sections per leg (hip, thigh, knee, shin, ankle, foot); the original mesh is split without changing the assembled silhouette
- **Stage 07**: swap the original shin for the Rook S2 narrow-spar shin on either side, retaining the existing ankle and foot
- **Stage 07**: dependency-aware detachment (remove a shin with its supported ankle and foot, or disassemble the supported components first), persistent detached assemblies
- **Stage 08**: inspectable hip/knee/ankle hinges with independent one-axis pose controls for each leg
- **Stage 08**: two-ended, telescoping knee hydraulics driven by actual thigh/shin anchors; both original and Rook S2 shins supported
- **Stage 08**: neutral, crouch, left/right step, and asymmetric poses; resettable two-knee motion sweep; stroke diagnostics and conservative clearance hints
- **Stage 08**: six independent manual joints with a tracked two-ended hydraulic actuator
- **Stage 08D**: live-game two-link IK transplanted without combat dependencies; planted-foot crouch, committed single-foot lift and grounded two-step preview
- **Stage 08D**: body translation coordinated with stationary support-foot world anchors; manual joint mode remains separate
- **Stage 08D**: validated v5 JSON blueprints include foot targets, derived joint poses and manual mode
- **Stage 08E**: component-authored shin spans and knee/ankle receivers; 160 mm longer Pylon L1 shin with distinct load-bearing geometry
- **Stage 08E**: the unchanged graph and live IK automatically use each installed shin’s actual length; mixed configurations adapt grounded stance and shorter achievable poses without clipping joints
- **Stage 08E**: construction viability reports connections, grounded stance, full crouch availability, step envelope, component dimensions, and *unverified* collision clearance
- **Stage 09**: generic typed subassembly replacement proposal checks upstream interface, mount standard, side, load rating and every retained downstream connection before committing; original components are parked with their serials intact
- **Stage 09**: Forge T2 compact upper leg (75 mm shorter, 125 kg) and Dockpad F2 wide stabilizer foot (40 mm deeper contact sole, 69 kg), alongside all three shin options
- **Stage 09**: joint coordinates and planted-foot height are measured from the installed thigh, shin and foot, including a shared chassis-height baseline for uneven leg lengths
- **Stage 09**: validated v7 blueprints preserve original serials, interchange configurations, grounded targets and stored owned parts
- Isolate / explode previews, JSON blueprint export and import
- Assembly and blueprint unit tests

**Not implemented yet:** cross-family leg mixing, arbitrary attachment placement, multi-axial joint solvers, force/torque-driven walking, full collision sweep resolution, dynamic balance, individual paint, damage propagation, new full manufacturers, or combat. Kestrel and Hauler remain paired mobility packages. Stage 08 only drives controlled single-axis poses; it does not simulate actuator forces, true swept mesh interference, or walking.

## Why some source files are here

`IMPORTED_COMPONENTS.md` lists the **minimal transitive ES-module dependency set** needed by the experimental construction page. Visual builders share small geometry and material utilities, so some imported helpers are not called directly by `constructionLab.js`.

The one-time `.github/workflows/bootstrap-lab.yml` workflow imported these files from the public M3CH4 branch `experiment/universal-construction`; this repo is now independently editable. It will not continually overwrite your edits unless explicitly invoked again. The permanent `lab-checks.yml` workflow runs JavaScript syntax checks and `npm test` on updates.

## Development

Use a local HTTP server to preview ES modules, or GitHub Pages. There is no bundler or package installation needed to run the studio: Three.js is loaded from the pinned CDN import map. The Node test suite runs with `npm test`.

## Stage 07 — try it

1. Open the lab and choose **MOBILITY**. The Stage 07 workbench exposes both legs and the one-click **Rook S2** shin swap.
2. Open **ASSEMBLY** and tap a named shin node (or tap its mesh in the 3D scene). In **INSPECT**, replace the shin or detach it **with supported assemblies**.
3. The detached original shin (and, where appropriate, its ankle and foot) remains in **OWNED / PARKED ASSEMBLIES**. Reinstall it later using its original serial.
4. Use **EXPORT JSON** and **IMPORT JSON** to verify asymmetrical configurations. Version 1–6 blueprints remain importable; new exports use version 7.

**Scope:** Stage 07 is a static assembly/geometry proof, not a mechanical gait solver. The alternate shin uses the same authored knee and ankle locations, and its 20 kg mass reduction is represented in the lab's derived assembly mass.

## Stage 08 — Try the mechanical joint laboratory

1. Open the lab and select **POSE**. Use six independent sliders to bend the left and right hips, knees, and ankles. Each slider shows its authored degree limits.
2. Try **CROUCH**, **STEP L**, **STEP R**, and **ASYMMETRIC**; **NEUTRAL** resets all hinges.
3. Select **TEST BOTH KNEES THROUGH STROKE** to observe the two cylinders following their moving anchors through a motion sweep. The pose is restored when the test ends.
4. Select an actual **hip**, **knee**, or **ankle** in **ASSEMBLY**, then open **INSPECT** to move the corresponding bearing.
5. Change the left shin to **Rook S2** in **MOBILITY**, and repeat the knee sweep. It should still articulate using the same physical interfaces.
6. Export a v4 blueprint while crouched, reset, then import: the pose and shin configuration should return.

**Important:** This is controlled, one-axis kinematics with physical joint pivots and a visually telescoping hydraulic. The clearance indicator is a coarse AABB warning, not an exact per-triangle or full swept-volume collision detector. Joint articulation does not yet drive locomotion, load, torque, or balance. 

## Stage 08D — Live walking logic in the construction lab

The purpose here is to reuse what already works in live M3CH4. The portable `liveLegIK.js` is a transcription of `solveLegIK` from live `articulationMotion.js` without the original combat/reload import. `constructionGroundedPose.js` adapts the live foot-contact strategy to authored Yardwalker attachment coordinates. The rest of the game, combat dependencies, maps, and physics simulation are not imported.

1. Open **POSE** and choose **PLANTED CROUCH**: the body lowers 15 cm while both ankle anchors remain in place.
2. Choose **LIFT LEFT** or **LIFT RIGHT**: the supporting pad remains at its world anchor, while the other leg lifts and moves forward.
3. Select **TEST PLANTED TWO-STEP MOTION**: an animated committed left/right step with stationary support contacts and a chassis that advances modestly. Stopping or finishing restores the original pose.
4. Choose **MANUAL JOINT MODE** to adjust each authored hip/knee/ankle angle without foot constraints. The old manual hinge sweep remains a diagnostic.
5. Replace the left shin with **ROOK S2** in MOBILITY and repeat. The two shins currently share knee/ankle anchors, so the same IK solves both. Longer/shorter future shins will require their own interface geometry and reachable-target tests.

The geometry tests confirm planted ankle Y/Z positions under crouch, one-foot steps, and the two-step walk. Full swept collisions, out-of-plane body shifting, propulsion, and load-driven balance are not simulated. Stance and swing timing follow the live design but are intentionally simplified for stationary laboratory demonstration.

## Stage 08E — The first mechanically different leg

1. Choose **MOBILITY** → left **PYLON L1 +160 MM**. The real ankle attachment socket is 160 mm below the stock knee-to-ankle span, and the original ankle and foot remain attached through the graph. The new shin is 135 kg (original 110 kg; Rook S2 90 kg).
2. Open **POSE**. Check **CONSTRUCTION VIABILITY**: connections, two-foot grounding, achievable crouch, live two-step envelope, and actual left/right shin lengths. Accurate swept-mesh clearance and dynamic balance remain explicitly **unverified**.
3. Try **NEUTRAL**, **PLANTED CROUCH**, **LIFT LEFT/RIGHT**. The solver uses the installed shin's measured endpoints. When a requested pose exceeds limits, the laboratory reports reduced motion instead of silently clipping or stretching geometry.
4. Try the planted two-step test. Its stride and clearance are validated *once per configured machine*, then the same contact trajectory is used for the whole motion.
5. Install Pylon on the opposite side, or mix Pylon with Rook and Yardwalker. Export and import the v6 blueprint and check that each shin's geometry and the foot targets remain intact.

**Design boundary:** Our first Pylon is longer, not wider and not a new locomotion topology. Only the current Yardwalker two-leg layout is solved. Manufacturer standards, actuator force, full collision volumes, dynamic balance, paint and additional limb arrangements will be separate causal stages; this pass is not Stage 09–12.

## Stage 09 — Genuine multi-component leg building

1. Open **MOBILITY**. Expand **LEFT LEG** or **RIGHT LEG** independently. Each exposes **THIGH** (stock / Forge T2), **SHIN** (stock / Rook S2 / Pylon L1) and **FOOT** (stock / Dockpad F2).
2. Replace one thigh with the Forge T2. Its knee receiver is **75 mm nearer the hip**. The knee and everything downstream automatically move with the same attachment graph.
3. Fit Pylon L1 (+160 mm) and Dockpad F2 (+40 mm sole depth) on that side. The Dockpad is a **69 kg lightweight spreadfoot**, deliberately within the existing 70 kg foot and 120 kg ankle socket ratings.
4. Open **POSE** and examine both measured limb chains, the generated standing height, viable crouch distance, and any step reduction. Shorter limbs may force the whole chassis lower to reach the same planted floor.
5. Open **ASSEMBLY** and **INSPECT** to swap any of those three physical parts. Attached descendants retain their own serials and their positions follow the new parent's sockets.
6. Export a **v7 blueprint**, import it, and verify the mixed machine returns with its owned/parked components and pose intact. Older v1–v6 blueprints remain compatible.

**Architecture:** `proposeComponentReplacement()` in `assemblyGraph.js` is the reusable graph primitive. It knows nothing about shin IDs or the preset pairs: both upstream and child-facing typed interfaces must match, and all socket capacities are validated. `replaceAnatomyComponent()` applies that proposal transactionally while preserving old parts in the owned tray.

**Limits:** This is an interchangeability laboratory, not a universal drag-and-drop mechanism. The new pieces use Yardwalker-compatible medium interfaces. Arbitrary connectors, adapters, precise swept-volume collisions, dynamic balance, foot load forces, independent paint and service records are separate future stages. The live combat repository is unchanged.
