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
- **Stage 10**: the same rotary-bearing and linear-actuator catalogue definitions can serve any compatible joint or mechanism port—not knee-specific IDs
- **Stage 10**: physically serviceable and individually serial-owned B-40/B-62 rotary bearings and P-48/P-70 hydraulic drives, with two independently mounted copies per design
- **Stage 10**: each installed bearing dictates its angular envelope; the two-ended actuator's physical stroke and its actual thigh/shin clevis positions further constrain powered movement
- **Stage 10**: removing a drive leaves a valid but unpowered mechanism; reinserting the owned drive restores assisted movement
- **Stage 10**: structural links are defined as reusable rigid-link interfaces; thigh and shin are the present INSTALLATION ROLES rather than universal-purpose restrictions
- **Stage 10**: validated v8 blueprints preserve mechanism assignments, detached owned parts, serials, coupled endpoints and mechanical poses
- **Stage 11**: data-driven graph pivot evaluation drives both Yardwalker hinges and independently mounted manipulator bearings
- **Stage 11**: independent chassis manipulator (utility bracket → reusable L-53 link → B-series rotary bearing → L-43 link) with a two-ended P-series drive
- **Stage 11**: arm hinges/cylinders reuse exact B-40/B-62/P-48/P-70 catalogue IDs and their serial-owned hardware inventory—no elbow-specific clones
- **Stage 11**: non-anatomical rigid-link definitions declare sizes, socket standards, mass, attachment locations and compatible applications
- **Stage 11**: arm presets, manual sweep, live measured actuator length, and bearing/stroke limits
- **Stage 11**: version 9 blueprints preserve arm topology, drive/bearing identities and independent angle while v1–v8 remain importable
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

## Stage 10 — Functional, reusable mechanical hardware

**Design principle:** a bearing is a `rotary-bearing`; an actuator is a `linear-actuator`; a generic rigid strut is a `structural-link`. A part does not become a different design merely because it is installed at a knee rather than an elbow. The currently installed anatomy and the parent's typed sockets determine its role. Only genuinely anatomical or special-case components should declare restricted usage. The test lab presently authors those ports on Yardwalker's knees and thighs; elbow, shoulder, hand and additional arbitrary placements are not yet instantiated.

### Try it

1. Open **CATALOGUE → MOBILITY**, expand a leg, and find **ROTARY JOINT** and **LINEAR DRIVE** below thigh/shin/foot options.
2. Replace **B-40 Utility Rotary Bearing** with **B-62 Wide-Swing Rotary Bearing**. Inspect the new bearing model, 16 kg mass and widened bearing limits.
3. Leave **P-48 Utility Linear Drive** installed and inspect **POSE**. Its shorter physical stroke prevents exploiting the bearing's full range.
4. Replace it with **P-70 Extended-Travel Drive**. Its broader stroke and different lower-clevis anchor unlock deeper knee bending, subject to the actual articulated geometry.
5. Remove the drive. The bearing stays owned and mechanically present, but the guided crouch and walking preview reject an **unpowered** configuration. Reinstall the drive using the same serial.
6. Try one side B-62/P-70 and the other side B-40/P-48. Export a v8 blueprint, import and verify each physical device, linkage connection and pose.
7. Detach/reinstall the whole leg: serial-owned mechanisms remain part of your inventory and reconnect when the structural assembly returns.

**Important boundaries:** this is functional kinematic compatibility, not a fluid-pressure solver, actuator force/power calculation, or balance simulation. A linear drive has a single structural parent at the host link's `drive-mount` socket and a validated *second mechanical endpoint* on another moving component. It does not acquire a fictitious second parent in the structural graph. Physical linkages use measured local anchors for both the visual actuator and the range solver. No full swept-volume collision solver or torque limits yet.

**Engineering architecture:** generic hardware definitions are in `constructionMechanisms.js` and remain location-independent. `constructionArticulation.js` derives limits and stroke from active device serials. `constructionGroundedPose.js` and its lab adapter reject unattainable or unpowered foot targets, without silently clipping. `assemblyGraph.js` validates role/standard compatibility on physical mounting ports.

**Compatibility:** v1–v7 blueprints still import. v8 adds the mechanism ownership/binding fields. Source changes are confined to M3CH4Ex; the live M3CH4 game is unaffected.

## Stage 11 — First non-leg articulated machine

**Demonstration:** open **MANIPULATOR** in the construction lab, then tap **ASSEMBLE TEST MANIPULATOR**. The real structural attachment chain is:

`frame utility-manipulator socket → construction-manip-bracket → L-53 rigid link → B-40 rotary bearing → L-43 rigid link`

A P-48 linear drive is independently mounted to the L-53's `drive-mount` and references the L-43's moving `driveAnchors.utility` clevis. The drive never claims a second structural parent. Its geometry follows the two posed graph nodes.

Switch the hinge between B-40 and B-62 and its actuator between P-48 and P-70. The mechanical range is computed from the installed bearing's rotary stops **AND** the actuator's end-to-end stroke. Use **TEST ARTICULATED SWEEP**, the manual hinge slider, or the Reach/Fold/Stow presets (unreachable poses are disabled). The knee hardware remains independently configured, sharing the **same catalogue definitions**.

The **L-53** and **L-43** are specified as multipurpose links with medium structural interfaces, mass, rigid dimensions, bearings/clevis receivers, and lists of possible uses. They are currently assembled as an industrial arm, not hardcoded as biceps or shins. Conversely, an anatomically specialized assembly may still intentionally declare application restrictions.

To remove the machine, tap **REMOVE COMPLETE MANIPULATOR**: the entire five-component structural branch becomes detached but remains in the serial-owned inventory, while both legs retain their previous joint hardware.

**Generalized architecture:** `constructionKinematics.js` resolves serial-addressed X-axis joint channels, and `constructionArticulationVisual.js` applies those same parent/descendant transforms to the manipulator and leg branches. `constructionManipulator.js` supplies the demonstration catalogue links, structural graph attachments, independent hardware operations and explicit secondary hydraulic connection. `constructionManipulatorVisual.js` creates physically connected industrial member visuals. The manipulator has its own joint command and never requires a new bespoke gait animation.

**Test boundary:** This is a constrained five-component installation at an authored utility mount, not an arbitrary universal socket-layout editor. Current graphical articulation demonstrates one-axis rotary pivots and two-ended linear actuators; ball joints, prismatic joints, triaxial IK, dynamic loads, and exact swept-volume collision are not implemented. Frame swaps require detaching a dependent manipulator first; unrelated station changes park and restore its exact serials. Live M3CH4 is not modified.

**Compatibility:** new exports use **v9**. Existing v1–v8 lab blueprints continue importing without a manipulator.
