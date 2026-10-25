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

## Stage 12 — Fundamental Graybox Construction (independent mode)

**[Open the graybox builder](https://lowlevelwizards.github.io/M3CH4Ex/graybox.html)** · [Open the original detailed lab](https://lowlevelwizards.github.io/M3CH4Ex/)

This is an intentional **breadth-first reset of visual construction**, *not* deletion of existing Stage 07–11 component work. The independent `graybox.html` experiment shares **actual existing production catalogue IDs** for its three original frames, three cabs, three mobility systems, five guns and three generators. It defines just three additional foundational visual prototypes: a narrow SPAR frame, bubble canopy and low four-point crawler. The latter is **not a playable, animated locomotion implementation**.

Five mandatory stations remain enforced: **FRAME, CAB, COMBAT, MOBILITY, POWER**. A separate optional support family comprises manipulator, camera pod, plate shield, cooler, ammo box and light mast. Frame sockets are authored and carry category, position, orientation role and individual load capacity. Cab placement is explicitly front/top limited by physical style; weapons can occupy permitted left/right/top locations. Support parts can only mount to compatible available auxiliary nodes, independent of mandatory Combat.

Starter coverage: 4 frames; 4 cabs; 4 mobility silhouettes; 5 live-catalog combat guns; 3 live-catalog generators; 6 auxiliary types. Parts are complete replaceable assemblies; detailed joints and servicing remain accessible in the legacy lab, rather than being forced into this graybox.

The workshop provides tap-to-pick compatible socket markers, equally accessible named-socket buttons, constrained reparenting on frame changes (with displaced modules reported), load and generator demand indicators, minimal armored/bare configurations, per-assembly palette overrides, touch orbit/zoom, and independent version 1 JSON save/import plus local device persistence.

**Reference acceptance challenge:** ten different starter mechs inspired by the reference image board are recipes using exclusively this small shared set. Tests check required stations, authored attachment compatibility, structural mass, power availability, input validity and recipe roundtripping. They do not assert these are exact recreations. Current geometry is intentionally primitive: large forms first, design polish later.

**Boundaries:** The experimental four-point crawler, SPAR frame, bubble cab and six support items are silhouette prototypes. Their physics, balancing, damage, operation and production save compatibility are *not* implemented. The original detailed Stage 11 lab and live M3CH4 combat game are preserved unchanged. Integrating any accepted prototype into the gameplay builder remains a separate verified stage.


## Stage 13 — Reuse the machines we already built

The **same independent graybox builder** now uses existing M3CH4 authored geometry wherever a native visual is available: Bruiser/Skeleton/Wedge structural frames; Vista/Cyclops/Hearth cabs; Yardwalker/Kestrel/Hauler mobility families; Stump/Training/Rivet/S-6/Rocket weapons; Forge generator. The original `partVisuals.js` builder and manufacturer paint roles remain the single model source; the graybox no longer hand-imitates them.

Remaining visual prototypes are improved but explicitly **not new production gameplay parts**: Spar frame, Bubble cab, Crawler mobility, Dynamo/Draft generator rendering, and optional support accessories. The static graybox utility arm reuses the existing Stage 11 structural link visual builders; it does not imply new arm locomotion or combat controls.

**Presentation:** Each major assembly has three coverage states (BARE / ARMOR / ENCASED). Bare suppresses authored detachable protective meshes where the factory visual has tags while retaining steel load paths; armored displays the existing part's original appearance; encased adds visually separate segment-mounted shells. Mass difference remains the Stage 12 simple coverage estimate, **not** new armor HP/hitboxes or live damage behavior.

**Mounts:** geometry uses the actual visual bounding/contact surfaces rather than treating every station's center as a socket. Existing mobility mesh geometry is placed with the bottom of its real feet on the workshop floor, and the frame load bridge overlaps its crown. Cab roof/front seats, side/roof weapon carriers and aft equipment are placed against actual visible frame faces. Saved socket IDs and mandatory station rules remain identical; only the visual adapters changed.

The ten reference recipes still share one catalogue and use the same socket validator. Model/geometry regression checks assert that native kit meshes are used, all referenced machines retain grounded feet and physically overlapping frame connections, and adding encasement changes actual protective geometry.

**This remains a creative construction prototype:** before merging anything into the production M3CH4 game, evaluate the physical alignments and ten silhouettes from the actual iPhone UI. Complex collision, limb movement for the crawler, and new combat/support abilities are deliberately not claimed.

## Stage 14 — Architectural breadth and ten-reference rebuild

The independently hosted [Graybox Builder](https://lowlevelwizards.github.io/M3CH4Ex/graybox.html) now tests the reference-derived **five-station mechanical architecture** rather than imposing the same exterior torso/side gun on every machine.

**Frames (14A):** existing Bruiser and Skeleton retain their authored steel models but gain tall structural outriggers, shoulder bearings and extra load rails in the graybox visual. The old Wedge is represented here by a new compact, open **Cradle** tub and forward/top pilot interfaces. Spar gains further diagonal braces. Frame data now carries more meaningful dimensional differences and larger mass capacities for additional structure; none of these reworks silently modifies the existing combat game's chassis balance.

**Cabs and central bodies (14B):** a reworked, smaller **Hearth** enclosure can sit forward or on top of compatible frames; the **Bubble** receives front and top compatibility so a low canopy fighter is constructible. Four independent **body housing** choices—exposed, angular, cylindrical drum, and rounded machinery pods—can be changed without replacing Frame or Cab. These are separate visual assemblies that add preview mass and preserve the five mandatory stations. Vista/Cyclops reuse their existing native authored meshes.

**Weapon carriers (14C):** every existing gun remains a Combat station component. The same gun can be placed on a direct receiver, compact two-link arm, heavy two-link carrier or elevated offset pintle; previews contain visible shoulder, elbow, terminal receiver and structural actuators. An arm-carried gun therefore still satisfies Combat. Independently installable lightweight/heavy auxiliary arms reuse the Stage 11 structural-link visual modules. These are *static mechanical presentation prototypes*, **not a completed free-aiming, gun-stabilizing or damageable arm system in production combat**.

**Mobility (14D):** original Kestrel, Yardwalker and Hauler are preserved. The new Stubber is a short two-legged industrial prototype with independent knees, ankles and planted boots; the earlier four-point Crawler remains available experimentally. Lowered/standard/raised mounting relationships and stock/skid/split-toe kits create different stances without requiring a new locomotion solver. Independent left/right bolt-on thigh/shin/ankle plating and assembly colors allow uneven armor. The underlying original mobility rigs are retained.

**Nested sockets:** the installed cab exposes a low-load roof accessory connection; an installed gun carrier exposes a shield connection. An accessory on one of these ports becomes an actual child of the relevant cab/weapon in the scene graph, not an arbitrary sibling attached to the chassis. Capacity, socket compatibility, installation/removal, save/load, and color-target validation use the same rules as ordinary frame sockets.

**Reference audit (14E):** all ten configurations have been revised using the **same** frame, cab, weapon, mobility, housing, arms, support attachments and finish options—no unique whole-machine model per reference. Tests assert all mandatory stations, allowable sockets, mass/power budget, scene-graph inheritance, grounded mobility, and the presence of mechanical carrier/housing geometry. The models are approximation targets for manual inspection, not claims of precise visual replicas.

**Save compatibility:** Graybox v1 remains readable. Newly optional `form` and `limbPlating` records default automatically when opening an existing Stage 12/13 blueprint. The detailed M3CH4Ex lab, its v9 assembly blueprints, and live M3CH4 remain unchanged.

**Current limitations:** The new Stubber locomotion, shield collision, arm IK, weight/torque, new armor hitboxes, optional auxiliary behaviors and transfer of graybox rigs into the campaign are **not implemented**. Load/power in this builder is a coarse planning indicator, with arm motion demand reported as a separate potential peak rather than continuously charged while static. Future work should prioritize visual mounting audits and player-readable construction workflows before advanced simulation.

## Stage 15 — Mechanical mating, armor anchoring, and isolated inspection

**Purpose.** Follow up the broad Stage 14 experiment with mechanically intelligible joints, physically seated mounts, and a readable ten-reference presentation without inventing more mandatory combat stations.

- `grayboxRigging.js` holds stable frame-local steel mating datums. Optional shells and armor do **not** shift these mounting interfaces. Installed hardpoints receive visible load-spreader plates and steel retainers; unoccupied hardpoints don't clutter the silhouette.
- Stage 11 manipulator links now use each authored `mechanical.end` to place the next joint, ending with wrist-mounted actual gripper jaws; heavy and light arms reuse a single connection chain. The assembly models remain static in Graybox. Future live arm control must use joint limits, actual actuators and collision checks.
- Structural combat mount configurations have physically distinct mechanisms: hanging two-link carriers and a rigid **raised pintle**. The weapon breech seats at the carrier terminal; shields attach at the actual weapon-carrier receiver and inherit the weapon assembly's motion in the scene hierarchy.
- Angular, rounded and cylindrical housings now have supporting side brackets. The vertical drum wraps the machine instead of resembling a flat front-mounted disk. Native live-game part models still take precedence wherever they exist.
- Feet now reference the original authored leg `foot` and `ankle` anchors rather than the overall mobility AABB; independent protective thigh and shin shells follow each specific leg's hip/knee/ankle positions. Existing live Kestrel, Yardwalker and Hauler mobility geometry remains in place.
- Support devices gain visibly bolted brackets, braces and stems. Supplemental Bare/Armored/Encased native coverings gain retaining brackets instead of unsupported decorative AABB plates.
- Camera automatically frames each current build or isolated part at phone and desktop viewport sizes, while preserving intentional manual pinch/wheel zoom. Compact Stubber now receives its own accurate prototype warning rather than a misleading Crawler notice.
- **Part Audit tab:** choose any of the 29 catalogued part types, view it alone with an explicit input reference, select Bare/Armored/Encased, or compare all three side-by-side. `grayboxAudit.js` renders the same shared asset builder used by the main workshop.

**Checks.** Existing mandatory-station, mass/power and save/load tests are preserved. Stage 15 adds automated inspection of all 29 parts at all 3 coverage levels (87 preview variants), connected arm-chain endpoints, distinct weapon carriers, permanent hardpoints independent of housings, foot/armor alignment against established mobility data, and full browser smoke for mobile Part Audit and Stubber labels.

**Boundaries.** This pass fixes static workshop construction geometry, not live-game motion, articulated collision volumes, physical damage simulation, power-transmission routing or production support behaviors. Visual clearance from every possible camera angle still needs hands-on screenshot evaluation in the experimental builder before transferring these designs to the campaign.
