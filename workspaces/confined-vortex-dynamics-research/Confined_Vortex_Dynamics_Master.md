# Confined Vortex Dynamics: Physics, Historical Research, Patent Landscape, and Evidence Program
**Edition:** 0.1 — Foundational architecture and sourced seed review  
**Date:** 2026-11-16  
**Project:** Confined Fluid Dynamics  
**Status:** Planning and foundational synthesis complete; systematic breadth review and quantitative source extraction NOT complete  
**Procedure:** Terminals MCP Procedure nonce 4c1e8899-2ed6-42ad-91f5-2ba836f6e1a0  
**Maintainer handoff:** Research_Status_and_Next_Batch.md  

## Executive perspective

**Central research question:** Under which geometries, boundary conditions, forcing histories and phase conditions do confined vortices form, persist, reorganize, interact, break down, oscillate, or dissipate, and how can those changes be distinguished experimentally?

A confined vortex is not adequately characterized by the presence of visibly rotating fluid. The controlling system includes the vorticity-production mechanism, pressure/flow forcing, finite boundaries, every inlet and outlet, wall layers, leakage and bypass paths, downstream hydraulic or acoustic impedance, and the possibility of more than one stable or transient state. A vortex may have strong swirl but weak axial transport, or weak visible rotation yet significant localized vorticity. A swirling core does not by itself establish vortex breakdown, cavitation, a particular coherent structure, or an acoustic mode.

This work has two outputs within the same research program: (1) a durable scientific synthesis with conservation-law and geometry-first reasoning, and (2) a reproducible acquisition and comparison process spanning nineteenth-century foundations through 2026, including independent academic investigations and patent families. It intentionally exceeds the narrower, existing Dimensionless Threshold Research Program, which remains a specialized source collection and not the source ceiling for this monograph.

**Evidence boundary:** The named publications and patents in the Seed Corpus were checked against publisher, institutional, or patent-index pages. Most are not yet quantitatively processed from complete original full text; no unverified critical swirl number, preferred ratio, precise onset threshold, performance coefficient, patent effectiveness, or baseline-device observation is asserted.

## 1. Source controls, question hierarchy, and terminology

Project controls:
1. Confined Fluid Dynamics Device Geometry and Acoustic Reasoning Control Standard (provided project PDF; controlling).
2. Confined Fluid Dynamics Verbose Project Instruction (project source archive; secondary).
3. CFD Dimensionless Threshold Research Program — Revised Batched (specialized existing program; reusable method but not an identical scope).
4. Source publications and patent disclosures identified in Section 10; individual claims require original context.

Research question hierarchy:
- Q-Fundamental: What is the vorticity field, circulation and angular-momentum budget, and how does the wall create, transport or dissipate them?
- Q-Geometry: Which walls, passages, insertions, planes, cross sections and inlet/outlet connections constrain the path of momentum?
- Q-Mechanisms: When are the core, boundary layers, shear layers, stagnation, recirculation and secondary vortices present?
- Q-Regimes: What onset, developed state, hysteresis, cessation, intermittency or failure boundary is actually supported?
- Q-Coupling: How do the chamber, inlet resistance, outlet impedance, acoustic loading and phase behavior interact?
- Q-Evidence: Which measured variables discriminate a candidate mechanism from alternatives?
- Q-Engineering: Which geometries and patent disclosures isolate a transferable causal mechanism, and which do not?

Terminology discipline:
- **Swirl:** azimuthal component of mean or instantaneous velocity about a declared axis. Swirl is not equivalent to an isolated vortex tube.
- **Vorticity:** curl of the velocity field; nonzero local vorticity can occur in shear even without a visually compact rotating core.
- **Circulation:** line integral of velocity around a closed contour, with an explicit sign and orientation.
- **Vortex core:** a region defined operationally by a declared criterion (e.g., pressure, swirling strength, Q, lambda-2); competing criteria need not agree.
- **Vortex breakdown:** a specified transition of a swirling flow's core/axial topology; mere sound or visible disorder is insufficient.
- **Reconnection:** change of vortex-line topology in a viscous flow; not inferred simply from counter-rotating streams touching.
- **Confined:** solid or effective boundaries materially influence the vorticity, pressure, return flow, and momentum pathways.
- **Passive:** no separately actuated source of torque or mechanical/electrical work inside the device; an external pressure or flow source still supplies energy.

## 2. Four-axis catalog architecture

Every source is indexed by independent dimensions, never by a single mutually exclusive device family.

### 2.1 Mechanism tags

| Code | Mechanism | Essential questions |
|---|---|---|
| M01 | Vorticity generation | Tangential injection, wall shear, rotating wall, baroclinic torque, impingement |
| M02 | Transport and core structure | Advection, vortex stretching, viscous diffusion, entrainment, multiple cores |
| M03 | Radial pressure and axial flow | Center pressure, adverse gradients, stagnation, outlet extraction |
| M04 | Boundary layers and confinement | End walls, Ekman-type pumping, curvature, roughness, leakage, finite aspect |
| M05 | Breakdown and reorganization | Bubble-like and spiral states, axial reversal, hysteresis, topology |
| M06 | Vortex interaction | Co-/counter-rotation, collision, competition, reconnection, asymmetry |
| M07 | Instabilities and oscillation | Precession, shear-layer instability, modal switching, fluidic feedback |
| M08 | Dissipation and pressure loss | Wall torque, mixing, separation, diodicity, pumping penalty |
| M09 | Compressibility and acoustics | Choking, wave propagation, resonant feedback, sound generation |
| M10 | Multiphase and phase change | Cavitation, gas entrainment, bubbles, wetness, particle loading |
| M11 | Heat/mass transfer | Thermal transport, particle separation, reactive/combustion flows |
| M12 | Measurement and inference | PIV/LDA/pressure probes, image-based vortex ID, CFD validation, uncertainty |

### 2.2 Geometry and topology tags

G01 sphere/hemisphere; G02 cylinder/end-wall cavity; G03 annular/rotor-stator; G04 cone/cyclone/hydrocyclone; G05 straight/curved pipe and duct; G06 tangential inlet or peripheral slot; G07 opposed/counter-rotating/coaxial inlets; G08 impinging jets/multiple nozzles; G09 axial/core extraction and vortex finder; G10 vented vortex valve/diode/amplifier; G11 diffuser/contraction/ejector and downstream restriction; G12 feedback-loop/passive oscillator; G13 rough/compliant/deformable walls; G14 open/unconfined benchmark (analogy only); G15 microfluidic device; G16 porous or multiphase-containing confinement.

Additional required flags: phase (gas/liquid/gas-liquid/other), drive (pressure/flow/rotating wall/thermal), steady/transient/periodic, laminar/transitional/turbulent, compressible/incompressible, inlet count, outlet count, axis orientation, confinement aspect ratio, wall condition, observation method.

### 2.3 Evidence class and status tags

| Class | Meaning | Permitted use |
|---|---|---|
| T | Foundational derivation, theorem, monograph | Physical assumptions and theoretical statements, not automatically measured performance |
| E | Direct experiment with geometry and observations | Measurements within reported apparatus and conditions |
| N-V | Numerical work with credible validation | Conditional computational findings |
| N-U | Numerical work without suitable validation | Numerical hypothesis or sensitivity lead |
| R | Review or meta-analysis | Entry point and synthesis; trace pivotal claims to primary sources |
| H | Thesis, governmental or lab report | May contain unique tests; assess methods independently |
| P | Patent publication/family | Claimed invention, disclosed construction and cited prior art; no automatic performance validation |
| C | Vendor/industry contextual statement | Discovery lead or dimensions only unless independently verified |

Status fields are separate from evidence class: discovered, metadata-verified, full-text-located, processed, replicated, conflicting, reserved, rejected, inaccessible. Scientific reliability A/B/C and project relevance R1/R2/R3/R4 are recorded independently. Patent identity is consolidated at family level for counts while national publications remain traceable.

### 2.4 Era and investigator coverage

| Era | Deliberate literature lens | Candidate investigator lineages to trace (not a completed bibliography) |
|---|---|---|
| To 1899 | Helmholtz vorticity, circulation, potential-flow and vortex-ring analysis | Helmholtz; William Thomson/Kelvin; Lamb and related classical hydrodynamic work |
| 1900–1949 | Viscous vortex cores, boundary layers, cyclone and industrial swirl | Oseen; Burgers; Prandtl; early cyclone inventors and equipment engineers |
| 1950–1969 | Breakdown theory, confined swirling experiments, fluidics and control | Benjamin; Hall; early vortex valve/diode inventors |
| 1970–1989 | Experiments and modes, vortex amplifiers, cyclone geometries, industrial control | Leibovich; Faler; Escudier; Syred and independent device lines |
| 1990–2009 | DNS/CFD, vortex identification, reconnection, validated device studies | Saffman; Jeong; Hussain; Lucca-Negro; O'Doherty and others |
| 2010–2019 | 3D topology, transient source effects, microfluidic and multiphase systems | Independent laboratory clusters identified by citation graph |
| 2020–2026 | Modern reconnection, vortex breakdown, high-fidelity numerics, compact devices | Yao; Hussain; Naumov; Okulov and newly screened lineages |

The named lineages are search anchors, **not** a complete researcher list. Distinguish an original theorist from later authors who reproduce the same geometry, and identify competing interpretations across laboratories.

## 3. Academic and patent acquisition protocol

### 3.1 A broad but structured collection

Use a **living discovery register**, not an arbitrary claim of having covered all literature. Initial design targets, subject to recalibration:
- 600–900 distinct academic/report candidate records for screening.
- 150–250 distinct patent-family candidates, expanding when the citation landscape requires.
- 200–300 in-depth original academic works/reviews and 50–90 technically relevant patent families for the eventual curated synthesis, based on information gain rather than quota filling.
- At least one distinct lineage per major historical era, and multiple independent source lineages in each central modern mechanism.
- Catalog every eligible find, including excluded and conflicting papers, before selecting a tight core for quantitative extraction.

These are **planning targets**, not claims about known numbers in the field, and are revised after three complete screening batches using novelty rate, topic coverage, lineage diversity, inaccessible rate, duplication, and missed landmark studies.

### 3.2 Search and retrieval channels

Academic discovery: publisher indexes for Journal of Fluid Mechanics, Physics of Fluids, Experiments in Fluids, Annual Review of Fluid Mechanics, Journal of Fluids Engineering, Fluid Dynamics Research, chemical and nuclear-engineering journals; Crossref and OpenAlex metadata; Google Scholar/Scopus/Web of Science where available; NASA NTRS, OSTI, NIST, institutional repositories, author manuscripts and thesis indexes. Search multidisciplinary physics, applied mathematics, control/fluidics, chemical engineering, acoustics, turbines, combustors, centrifuges and multiphase processing.

Patents: Google Patents, USPTO, Espacenet and WIPO Patentscope for priority/publication family, inventor, assignee, claims, figure numbering, backward examiner citations, forward citations, classifications (including F15C fluidic elements), and non-US equivalents. A patent family is counted once in coverage; its national documents and differing claims remain separate records.

Do not assume a search result or indexing page is complete full-text evidence. Save canonical title, names, year, journal/volume/pages or patent number, DOI/priority date, exact URL, access status, checked date and whether figures/tables have actually been inspected.

### 3.3 Combinatorial search matrix

Use three dimensions of search rather than searching only for named devices:
1. **Physics**: vortex breakdown; confined swirling flow; rotating cavity; vortex core; circulation; counter-rotating vortices; coherent structures; wall-generated vorticity; spiral breakdown; global instability; precessing vortex core; vortex reconnection; vortex-acoustic coupling; swirl cavitation; swirl-induced losses.
2. **Geometry**: spherical chamber; cylindrical cavity; tangential inflow; end-wall driven; axial outlet; vortex finder; annular chamber; offset multiple inlets; opposed jets; cyclone/hydrocyclone; vortex diode; fluidic vortex amplifier; ejector; diffuser; microchannel.
3. **Outcome/experiment**: onset; hysteresis; flow reversal; backpressure; confinement ratio; pressure loss; time-resolved PIV; LDV; vortex-identification criterion; spectral peaks; wall pressure; low Reynolds; high Reynolds; failure; leakage; roughness.

Also search synonyms in older literature: vortex breakdown/bursting, vortex valve/fluid amplifier/fluidic diode, spinning flow/swirl flow/whirling core, air core/central recirculation, jet attachment/Coanda, and original titles translated from German, French, Russian and Japanese. Preserve translations and historical terminology rather than recasting old work into modern concepts.

### 3.4 Screening order and source independence

**Pass A — Discovery (20 records/batch; up to 40 distinct resources):** deduplicate DOI and bibliographic records; patent records by simple family and priority; assign era, mechanisms, geometries, source class, primary/cross tags, independent lineage and search query; include and exclude with reason. Do not extract unsupported figures from snippets.

**Pass B — Access (10 documents/batch; up to 25 resources):** find publisher PDF/HTML, accepted manuscript, preprint, thesis and supplements, keeping a canonical citation. Record access failures instead of inventing missing values.

**Pass C — Full processing (5 documents/batch; up to 20 resources):** inspect equations, figures, geometry, tables, methods, measured ranges and uncertainty; preserve each Reynolds/Swirl/Strouhal definition and distinguish source values from analyst-computed values. Multiple tested configurations are separate geometry records but one bibliographic work.

**Pass D — Synthesis (mechanism by mechanism):** reconcile independent experiments before pooling numbers; compare topology and phases; locate contradicting/negative cases; add detailed historiographic and patent prior-art connections. Record strength of analogy and what genuinely transfers.

**Pass E — Falsification and editorial verification:** ensure an explicit counterexample for each widely repeated geometric prescription; check that claims about sound, phase change and named modes are experimentally discriminated; verify citations, figure rights, no phantom sources, and representative coverage of early and recent decades.

One batch per bounded task is the conservative default, inherited from the existing threshold program. The new topic may require more batches and may be rescaled with an audit record. Do not silently substitute a summary of abstracts for source processing.

### 3.5 Source record schema

A source record must retain:
source_id; canonical citation; original year; publication or grant date; authors/inventors; institutional lineage; DOI/patent number/priority family; source class; language; mechanism tags; geometry tags; phase; experiments/theory/CFD/claim; flow regime; methods; reliability; relevance; access and supplement status; independent-geometry lineage; extracted definitions and values; explicit limitations; conflicting findings; evidence class; decision and rationale; processing batch; stable links.

For geometry cases, separately record source_id + configuration_id, coordinates/viewpoint, solids/walls, inlet count and 3D vector, exact aperture and area, wall seals/leakage, chamber shape and characteristic dimensions, outlet pickup and downstream impedance, flow source, fluid properties, pressure and flow measurement locations, initial state, possible symmetry-breaking, and temporal record. For tape-built project configurations, add installation-layer order and two orthogonal inlet views before conclusions.

For patents, separately record inventor/assignee; earliest priority; family publications; independent claim scope; illustrated embodiment and port connectivity; asserted physical operation; what is disclosed as measured data (if any); prior art cited; dimension definitions; legal status **as-of-retrieval only**; an independent validation reference or explicit unknown.

### 3.6 Coverage and stopping criteria

Report coverage as a matrix (era × mechanism × geometry × source class × independent lineage) rather than as one document count. A major cell is under-covered if it lacks original-source evidence or is represented only by one repeating laboratory/patent family. Expand searches until:
- main mechanisms have at least two meaningfully independent empirical or theoretical lines where available;
- every influential design rule has boundary-condition qualification and a failure/limiting-case search;
- early theoretical lineages, 1960s–1980s fluidic patents, and current studies are all represented;
- most high-relevance sources have original full text and necessary definitions inspected;
- two successive calibrated batches add little new mechanism or contradiction information, with remaining gaps documented.

Never invent sources to meet numeric quotas. Preserve candidates that are credible but inaccessible in an explicit unresolved queue.


## 4. Governing physical model: what changes when the vortex is confined

### 4.1 Coordinates and control volumes

The generic apparatus is a finite fluid region V with walls W, inlet surfaces I_k, outlet surfaces O_j, and optional compliant/phase-changing subregions. For a locally cylindrical description choose z along the declared chamber or outlet axis, r normal to that axis, and theta with right-hand orientation. In a sphere, these coordinates are global descriptors only; a tangential inlet is defined by the **local sphere surface tangent**, not by a presumed chamber-wide cylindrical tangent. Positive z is the specified discharge direction for each configuration.

The principal force and transport chain is:

geometry and wall conditions -> inlet flow division and local velocity -> linear/angular momentum flux -> radial and axial pressure redistribution -> wall/shear-layer production -> core and recirculation states -> outlet and downstream coupling -> measurable pressure, velocity, visual and acoustic signals.

The same chamber may show radically different topology if the flow direction is reversed, one of two ports is blocked, an annular insert leaks, a vortex finder penetrates deeper, or the outlet resistance changes.

### 4.2 Conservation of mass and momentum

For a fixed control volume, the signed mass balance is

\[
\frac{d}{dt}\int_V \rho\,dV + \oint_{\partial V} \rho\,\mathbf{u}\cdot\mathbf{n}\,dA = 0.
\]

For an incompressible single-phase flow with effectively rigid walls, the time-averaged sum of inlet flow rates must match outlet flow rates. With compressibility, compliance, leakage or gas evolution, instantaneous inlet and outlet volume flows need not match.

The momentum balance includes pressure forces and stress/traction on walls. In a real device, an inlet pressure source does not impose both pressure and flow independently: the operating point depends on the coupled upstream source characteristic and chamber-plus-downstream resistance.

### 4.3 Angular momentum: the primary organizing variable

About a chosen z axis define specific angular momentum as h_z = r u_theta. For a fixed-volume flow, the transport form is schematically

\[
\frac{d}{dt}\int_V \rho\,r u_\theta\,dV
+
\oint_{\partial V}\rho(\mathbf{u}\cdot\mathbf{n})\,r u_\theta\,dA
=
T_{z,\mathrm{pressure}} + T_{z,\mathrm{viscous}} + T_{z,\mathrm{body}},
\]

with any additional moving-wall torques included when relevant. Inlet angular-momentum rate is approximately rho Q r_i u_theta,i for a single reasonably uniform inlet, **not** simply rho Q r_i U unless the velocity direction really is tangential. Opposed or competing inlets contribute with signs about the same axis; their flow rates and lever arms may be unequal. Wall torque, outlet angular-momentum flux and coherent-core angular momentum can be very different.

An inlet which merely points diagonally into a chamber cannot be assumed to create the same wall-following motion as a passage that physically constrains flow along the perimeter. The presence of a radial/axial bypass must be checked before claiming forced tangential injection.

### 4.4 Vorticity equation and core production

Let omega = curl(u). For constant-density incompressible Newtonian flow with constant kinematic viscosity nu,

\[
\frac{D\boldsymbol{\omega}}{Dt}
=
(\boldsymbol{\omega}\cdot\nabla)\mathbf{u}
+
\nu\nabla^2\boldsymbol{\omega}.
\]

The terms represent stretching/tilting of vorticity and viscous diffusion. In compressible or nonbarotropic systems the full equation also includes dilatation and baroclinic contributions; assuming the incompressible form for wet steam, gas-liquid mixing or strong compressibility would be inappropriate.

No-slip walls supply or redistribute vorticity through viscous boundary layers. Shear layers between coflowing or opposed jets can carry vorticity even when a long-lived centered core does not form. Wall-generated vorticity and axial/end-wall secondary flow may be decisive in a shallow chamber.

Circulation about contour C is Gamma = integral_C u dot dl. In viscous/confined flow it need not be conserved along an arbitrarily moving contour if the ideal-fluid assumptions of Kelvin's theorem are not met. The classic Helmholtz/Kelvin laws are foundational **reference limits**, not a claim that a hand-built dissipative device conserves circulation exactly.

### 4.5 Radial pressure balance and its limits

For steady approximately axisymmetric swirling flow with small mean radial acceleration, radial force balance reduces to

\[
\frac{\partial p}{\partial r}\approx \rho\frac{u_\theta^2}{r}.
\]

This is a local conditional approximation, not an assertion that every swirl device must generate a specified suction. Strong radial throughflow, unsteadiness, non-axisymmetry, viscous effects or multiphase pressure fields alter it. The center's absolute pressure is set by a global solution with outlet and inlet pressure constraints; a pressure gradient alone does not determine cavitation.

### 4.6 Rotation is not one vortex model

Compare deliberately simplified reference profiles, not interchangeable physical objects:

- Solid-body or forced vortex: u_theta proportional to r; core vorticity nonzero.
- Potential/free vortex outside a viscous core: u_theta proportional to 1/r; the ideal outer region is locally irrotational but has nonzero circulation around the singular/core region.
- Rankine composite: forced core and potential exterior; a conceptual piecewise profile.
- Lamb–Oseen: viscously diffusing two-dimensional vortex with a smooth core.
- Burgers vortex: stretching balanced against viscosity in an idealized steady axisymmetric model.
- Confined swirling jet: may develop axial-velocity deficit, recirculation and asymmetric modes absent from idealized isolated-core profiles.

Each should be included as a mathematical comparator and checked against wall, inlet and outlet boundary conditions before fitting measured data. The diagnostic question is not simply whether there is rotation, but whether a specified model predicts measured velocity profiles, pressure, time evolution and flow direction.

## 5. Ranked salient factors and primary document focus

The following ranking is **causal priority for interpretation**, not a claim that one universal scalar controls all regimes.

| Priority | Factor | Directly controls | Required measurement or reconstruction | Typical failure of inference |
|---|---|---|---|---|
| 1 | Actual inlet/outlet topology and bypass/sealing | Which streamlines can enter, recirculate and exit | Port positions, vectors, aperture masks, hidden passages, leakage | Inferring tangential flow from angle alone |
| 2 | Angular-momentum supply and wall torque | Sign, distribution and persistence of swirl | Q_i, u_theta,i, lever arms, wall/exit constraints | Inferring core intensity from number of inlet ports |
| 3 | Confinement, aspect ratio and end-wall conditions | Secondary return flow, confinement of stagnation/breakdown | D,H, curvature, end-wall motion, roughness | Transferring free-vortex behavior to shallow chamber |
| 4 | Axial/radial pressure-flow coupling and outlet impedance | Core extraction, backflow and pressure minimum | Pressure taps, outlet geometry, downstream tubing, driving curve | Assigning all pressure drop to vortex motion |
| 5 | Viscosity, inertia and residence/transport times | Core diffusion, wall layers, regime and decay | Fluid properties, Q, source-defined Re, residence time | Claiming generic critical Re for unrelated geometry |
| 6 | Inlet competition and symmetry/asymmetry | Shear interfaces, switching, off-axis cores | Inlet-specific Q/pressure, blockage and reversal tests | Calling a two-inlet phenomenon one edge tone |
| 7 | Local separation, stagnation and recirculation topology | Breakdown, secondary vortex structures, loss | Time-resolved flow field, axial velocity sign, wall-flow map | Calling every recirculation bubble 'breakdown' |
| 8 | Transient forcing, hysteresis and global instability | Onset vs cessation; intermittent states | Ramp-up/ramp-down histories, pressure/velocity spectra | One-point steady interpretation of multistate flow |
| 9 | Compressibility, phase composition, temperature | Choking, cavitation, vapor/bubble changes | Pressure relative to vapor pressure, phase imaging, gas content | Treating gas whirl as cavitation evidence |
| 10 | Acoustic/structural/compliant coupling | Observed sound and system modes | Matched baselines, geometry, audio, tube length, microphone position | Naming KH, edge tone or resonance from frequency alone |
| 11 | Measurement and numerical-model validity | What can actually be established | Calibration, uncertainty, resolution, mesh independence | Treating CFD colors as a measured vortex identity |
| 12 | Manufacturability and tolerances | Real rather than nominal flow path | Gap/roughness/seal/insert dimensional audit | Ignoring an annular bypass or collapsed aperture |

**Main editorial emphasis:** priorities 1–8 are the central physical chapters. Priorities 9–12 are coupled-phenomena, validation and implementation chapters that must not be folded uncritically into the first eight. Classification by device type is a supporting comparative atlas, not the principal organization.

### 5.1 Quantities to report, not to universalize

\[
Re=\frac{\rho U L}{\mu},\quad
St=\frac{fL}{U},\quad
Eu=\frac{\Delta p}{\tfrac12\rho U^2},\quad
Ma=\frac{U}{c}.
\]

A commonly used swirl number is a ratio of axial flux of angular momentum to chamber radius times axial momentum flux; its exact integral, pressure contribution and reference radius **must** be quoted from the source before two papers are compared. Other applicable descriptors: normalized circulation Gamma/(U L), inlet swirl ratio u_theta/u_z, blockage ratio, outlet/inlet area ratio, aspect H/D, roughness/D, Womersley, Dean, Strouhal, Rossby, cavitation number sigma and Weber number. Re based on an inlet hydraulic diameter is not identical to Re based on chamber diameter. Some quantities are inapplicable in gas-only or absent-phase devices.

Useful competing time scales:
- advection L/U and chamber residence V/Q;
- vortex-turnover L/u_theta (definition explicit);
- viscous diffusion L^2/nu;
- acoustic transit L/c;
- feedback-loop convective delay, if there is an actual feedback path;
- phase-change, condensation and wall-compliance times where appropriate.

### 5.2 Operating regimes are envelopes, not one onset number

For each phenomenon maintain separate records for first reported occurrence, credible onset, fully developed state, cessation, hysteresis width, alternate competing state, and conservative engineering operating region. Describe onset as a vector of geometry + nondimensional flow + boundary conditions, not one isolated Re or swirl number. Evidence is insufficient when inlet geometry or outlet impedance is unknown.

## 6. Core mechanisms: comparisons that the monograph must resolve

### 6.1 Vortex formation and persistence

Competing injection routes include tangential wall entry, distributed azimuthal momentum from vanes, end-wall rotation, and shear-driven vortices from opposed or offset jets. For each, separate forced torque from flow-generated vorticity and from apparent tracer rotation. Test sensitivity to a blocked inlet, reversed rotation, outlet closure/resistance and wall condition. Examine whether net angular momentum survives to the outlet or is dissipated near a thin wall layer.

### 6.2 Breakdown versus ordinary recirculation

The breakdown literature describes distinct bubble-like, spiral and sometimes asymmetric core states. An axial stagnation point/reverse-flow zone is stronger evidence than a mere swirl pattern. Benjamin's 1962 treatment proposes a finite transition between conjugate swirling-flow states; later breakdown reviews and measurements give different emphasis to asymmetry, flow visualization and spatially resolved velocity data. No universal criterion may be imported into a spherical or tape-formed chamber without a geometry/regime comparison. See Benjamin (1962), Leibovich (1978), Faler and Leibovich (1978), Lucca-Negro and O'Doherty (2001).

Discriminating observables: axial velocity zero crossing, reverse-flow topology, time-resolved core centroid, multiple stationary/propagating modes, pressure distribution and sensitivity to exit conditions. A vortex diode's reverse-flow resistance is not itself evidence of classical core breakdown.

### 6.3 Walls and end-wall boundary condition

Solid, free-surface, rotating and compliant end conditions are not interchangeable. Compare fixed lid, rotating disk, open interface and partially obstructed pickup. Naumov et al. (2020) is a direct seed for end-condition-dependent confined swirling-flow topology. Shallow H/D may magnify wall-layer effects and axial pumping compared with a deep cylinder. A pressure-controlled axial outlet is distinct from a closed end wall even if both are visually centered.

### 6.4 Multiple vortices, opposed flow and reconnection

Two ports producing opposite signed h_z can reduce total chamber angular momentum while increasing interfacial shear, mixing and time-dependence. If flow rates differ, the interface may move and one inlet may dominate. Counter-swirl, antiparallel vortex tubes and reconnecting vortex filaments are related but not identical problems. Reconnection requires a topology-sensitive measurement or sufficient high-fidelity field evidence; the 1990 Saffman model and the 2022 Yao–Hussain review are seed references. Effects predicted for free antiparallel tubes should be downgraded when walls, low Re or throughflow impose different topology.

Controls: operate each inlet separately, reverse one, swap unequal flow forcing, increase nozzle separation, block either inlet and compare the new state to both single-inlet baselines.

### 6.5 Swirl resistance, vortex diodicity and hydraulic coupling

Vortex diodes use a topology-specific difference between directions of flow; pressure drop includes entry, turning, wall, outlet, turbulent mixing and any cavitating component. The pressure–flow curve is a property of the **whole test system**, not a chamber-only universal coefficient. Compare pressure taps and reference flows before interpreting reported diodicity. Patents such as Kwok's vented fluid diode (US3461897A), Bendix's vortex valve (US3424182A), and Syred et al.'s vortex diode (US4112977A) illustrate different connectivity/forcing choices, not independent proof of the same device efficiency.

### 6.6 Oscillation and acoustics

A tone may arise from a shear-layer/edge feedback loop, outlet pipe mode, chamber resonance, fluidic switching, structural membrane/tape vibration, or recording artifact. A vortex precession mode is not established merely because a measured sound frequency falls in a plausible frequency neighborhood.

Use an **acoustic device-state ledger**: exact geometry, port status, wall/tape modifications, flow strength/pressure, downstream tube or bottle, microphone position, recording chain, ambient recording and unmodified-device baseline. Compare equivalent time windows and flow conditions. Use spectrogram persistence, harmonics, flow dependence, tube-length changes, blockage and reversal to distinguish hypotheses. When a feature disappears if either inlet is blocked, rank two-inlet interactions above explanations requiring only one isolated edge, unless another tested coupling explains it.

### 6.7 Multiphase and cavitating states

Distinguish (a) liquid cavitation due to local vapor-pressure approach, (b) air/gas entrainment, (c) gas release, (d) boiling/flashing, and (e) single-phase gas compressibility. Bubble images or crackling sound alone cannot separate these. Surface tension, dissolved-gas content, temperature, wetness, nucleation sites, backpressure and residence time may change the operating envelope. Microbubble and nanobubble claims require size-distribution measurement, sampling method and independent validation; a local pressure depression alone does not prove a sustained target size distribution.

### 6.8 Evidence conflict and counterexamples

Every mechanism chapter must include a failure-state column: vanishing swirl under smooth/effective radial bypass, core loss with high wall friction, axial extraction short circuit, two-dimensional CFD improvement failing in three-dimensional manufacture, cavitation suppression by geometry, mode loss under blocked inlet, and a persistent acoustic peak despite changed chamber geometry. Distinguish truly contradictory physics from unlike fluids, size scales, flow-driving conditions, definitions or boundary conditions.

## 7. Measurement and validation program

The minimum meaningful experiment on a new chamber starts by reconstructing geometry and preserving one unmodified baseline. Measure flow and pressure under controlled source pressure, including both ramp directions. Show at least plan and axial section; for a three-dimensional tape inlet show an orthogonal layer/side view, open-area mask, sealed and unsupported surfaces, and representative leakage/bypass paths.

Preferred sequence:
1. Geometry/topology audit including photographs, dimensions, seals, roughness and actual final aperture.
2. Leak and bypass assessment; quantify area or bound unknown geometry.
3. Individual-inlet pressure-flow curves and combined-inlet curve; repeat blocked/reversed states.
4. Near-wall and core tracer imaging or PIV/LDV where feasible; do not infer a 3D velocity field from a single 2D image.
5. Time-resolved inlet/outlet pressure and chamber pressure with synchronized imagery; record ramp-up/ramp-down.
6. Equivalent acoustic baselines and spectrograms; relocate microphone, alter tube length and check recording artifacts.
7. Reduced-order control-volume and dimensionless model with parameter uncertainties.
8. Independent CFD only with measured boundary conditions, mesh/time convergence, turbulence-model limitations and validation against observations.
9. Replication and intentional counterexample geometry.

For a proposed modification, write a delta table with changed/unchanged elements and nearest verified prior analogue. Propagate the change through capture area, local speed, losses, inlet momentum vector, angular-momentum flux, shear, separation, stagnation, recirculation, outlet coupling and observable changes. Rank dominant vs secondary effects and propose the smallest decisive test rather than an unranked mechanism list.


## 8. Proposed full monograph architecture

| Part | Chapters | Principal questions and required exhibits |
|---|---|---|
| I. Foundations | 1. Mathematical language; 2. Vorticity transport; 3. Angular-momentum and energy budgets; 4. Idealized core models | Derivation assumptions, model-comparison charts, historical timeline |
| II. Confined topology | 5. Walls and end effects; 6. Inlet architecture; 7. Outlet/core-extraction topology; 8. Chamber shape and aspect | Two-view geometry plates, port/flow connectivity maps, loss budgets |
| III. Dynamics | 9. Formation/persistence; 10. Breakdown and reversal; 11. Vortex–vortex interaction; 12. Stability, symmetry and oscillation; 13. Dissipation and turbulence | Regime-state diagrams, time scales, competing hypotheses and counterexamples |
| IV. Coupled phenomena | 14. Acoustic/elastic coupling; 15. Compressible flow; 16. Cavitation, entrainment and multiphase regimes; 17. Heat/mass transfer and particle separation | Phase-topology matrix, baseline-matched acoustic examples, conditional applicability |
| V. Historical and engineering atlas | 18. Chronological investigator genealogy; 19. Cyclones and vortex finders; 20. Vortex valves, diodes, amplifiers and fluidic oscillators; 21. Swirl combustors, mixers and jets; 22. Microfluidic/cavity devices | Patent-family tree, device cross sections, original vs inherited geometries |
| VI. Evidence and application | 23. Diagnostics and vortex identification; 24. Reduced-order and CFD modeling; 25. Threshold/uncertainty synthesis; 26. Project-device analogues and experimental designs | Full source ledger, normalized geometry database, evidence contradictions, test matrices |

A monograph section is considered mature only when it includes: definitions; conservation model and valid assumptions; geometry applicability; at least one independent original source; a limiting/counterexample; quantitative/regime parameters with source-specific definitions; a causal test; a confidence statement; and unresolved research questions. Patent illustrations receive their own geometry plates without turning claims into empirical facts.

### 8.1 Cross-cutting tables and figures

Required figures: vortex-model velocity/vorticity profiles, control-volume angular-momentum accounting, inlet capture vs bypass diagrams, end-wall secondary circulation, conceptual axial breakdown/reversal, two-inlet shear-interface alternate states, vortex-finder short circuit, nonlinear pressure-flow and hysteresis, fluid-acoustic coupling, and source chronology/patent family graphs.

Required databases: source registry; independently tested configuration records; normalized dimensions; flow/pressure operating cases; regime and threshold states; source-reported dimensionless definitions; negative evidence; conflicting definitions; patent families; and geometry/acoustic device-state ledgers.

## 9. Patent research strategy and technical interpretation

A patent is screened at two separate levels:

**Construction disclosure:** What exact chamber, walls, tangential/peripheral/axial passages, radial gaps, central vent, secondary control ports, and outlet shapes are disclosed or claimed? Record labeled figure numbers, cross-sectional interpretation, and each flow direction. Do not turn a schematic into an unreported dimension.

**Operating assertion:** What does the patentee claim: one-direction resistance, vented diode behavior, flow amplification, acoustic suppression, enhanced separation, delayed cavitation, or low-loss operation? Note whether the record actually supplies experiments, pressure-flow curves, units, material properties, operating ranges and comparator geometry. If not, classify performance as untested here.

Illustrative independent patent branches to investigate:
- **Kwok, US3461897A (1969):** a continuously vented vortex-fluid diode with two tangential conduits having materially different wall-connection shapes. The existence of a central vent means the port topology differs from a sealed two-port chamber.
- **Mayer/Bendix, US3424182A (1969):** vortex valve with an annular region, tangential control flow and an outlet; evaluate controlled versus passive operation separately.
- **Tucker, US3604442A (1971):** an angularly intersecting fluidic diode with a vortex-producing vent possibility; distinguish direct geometry from mere terminology.
- **Syred et al., US4112977A (1978):** thin cylindrical vortex diode with axial and tangential ports and a peripheral channel; potential historical reference for inlet-channel matching.
- **British Nuclear Fuels, US4830053 (1989):** vortex chamber with an axial port in one end wall and tangential port at the other, illustrating that inlet/outlet wall placement itself is an important variable.

Next patent discovery must systematically trace independent claims, priority families, cited predecessors and forward citations, not only the five illustrative seeds. Include historically earlier non-vortex fluidic diodes as **contextual prior art** when they clarify novelty or alternative loss mechanisms, not as proof of confined-vortex behavior. Older grant status displayed by indexing sites is not a current freedom-to-operate opinion.

## 10. Seed corpus: canonical starting references

These are verified **discovery seeds**, not a completed exhaustive review. Access from publisher/institution/patent pages was confirmed for identity and abstract/description. Full scientific processing, figure extraction and numeric comparison are pending. Read the linked original source before making detailed mechanism claims.

| Key | Year | Work and stable source | Evidence role and caution |
|---|---:|---|---|
| A01 | 1858 | Helmholtz, *On Integrals of the Hydrodynamic Equations That Correspond to Vortex Motions*. Historical translation: https://www-pord.ucsd.edu/rsalmon/Helmholtz.1858.pdf | Foundational ideal-fluid vortex framework; translation/source version should be recorded |
| A02 | 1867 | William Thomson (Kelvin), *On Vortex Motion*. Historical text: https://empslocal.ex.ac.uk/people/staff/gv219/classics.d/Kelvin1869.pdf | Classical circulation/vortex-motion lineage; source file bears later publication naming |
| A03 | 1962 | T. Brooke Benjamin, *Theory of the vortex breakdown phenomenon*, JFM 14(4):593–629. DOI 10.1017/S0022112062001482, https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/theory-of-the-vortex-breakdown-phenomenon/E240C2DF7183056BC943BB404A3A6174 | A theoretical state-transition interpretation, not universal threshold data |
| A04 | 1978 | S. Leibovich, *The Structure of Vortex Breakdown*, Annual Review of Fluid Mechanics 10:221–246. DOI 10.1146/annurev.fl.10.010178.001253, https://www.annualreviews.org/content/journals/10.1146/annurev.fl.10.010178.001253 | Historical review, asymmetric and bubble/spiral interpretations |
| A05 | 1978 | J. H. Faler and S. Leibovich, *An experimental map of the internal structure of a vortex breakdown*, JFM 86. NASA NTRS https://ntrs.nasa.gov/citations/19780053251 | Direct measured velocity/low-frequency flow evidence; preserve apparatus conditions |
| A06 | 1990 | P. G. Saffman, *A model of vortex reconnection*, Journal of Fluid Mechanics. https://authors.library.caltech.edu/records/jg9ps-f2j59 | Physical reconnection model; do not directly identify confined-device interaction |
| A07 | 1995 | J. Jeong and F. Hussain, *On the identification of a vortex*, JFM 285:69–94. DOI 10.1017/S0022112095000462, https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/on-the-identification-of-a-vortex/D26006DDB95FB28DA80E28A581182DF1 | Vortex identification; not a synonym for acoustic evidence |
| A08 | 2001 | O. Lucca-Negro and T. O'Doherty, *Vortex breakdown: a review*, Progress in Energy and Combustion Science 27:431–481. DOI 10.1016/S0360-1285(00)00022-8, https://www.sciencedirect.com/science/article/pii/S0360128500000228 | Synthesis of experiment, theory and numerics; primary citations need retrieval |
| A09 | 2020 | I. V. Naumov, M. V. Kashkarova, R. F. Mikkelsen, V. L. Okulov, *The structure of the confined swirling flow under different phase boundary conditions at the fixed end of the cylinder*. DOI 10.1134/S0869864320010084, https://backend.orbit.dtu.dk/ws/files/234701801/Naumov_2020_1_aV.pdf | Direct seed for changing end boundary condition; full figures not processed |
| A10 | 2022 | J. Yao and F. Hussain, *Vortex Reconnection and Turbulence Cascade*, Annual Review of Fluid Mechanics 54:317–347. DOI 10.1146/annurev-fluid-030121-125143, https://www.annualreviews.org/content/journals/10.1146/annurev-fluid-030121-125143 | Modern reconnection review including aeroacoustic questions |
| P01 | 1969 | C. C. K. Kwok, *Vortex Vent Fluid Diode*, US3461897A, https://patents.google.com/patent/US3461897A/en | Patent disclosure; differing tangential wall merges and continuous central vent |
| P02 | 1969 | Bendix Corporation, *Vortex Valve*, US3424182A, https://patents.google.com/patent/US3424182A | Patent disclosure; supply/control port topology |
| P03 | 1971 | H. G. Tucker, *Fluidic Diode*, US3604442A, https://patents.google.com/patent/US3604442A | Patent disclosure; nonidentical fluidic-diode topology |
| P04 | 1978 | N. Syred and co-inventors, *Vortex Diodes*, US4112977, https://patents.justia.com/patent/4112977 | Patent disclosure; peripheral channel/axial port; verify individual inventors in primary patent |
| P05 | 1989 | British Nuclear Fuels PLC, *Fluidic Devices*, US4830053, https://www.freepatentsonline.com/4830053.html | Patent disclosure; opposite-end tangential and axial port placement |

Citation discipline: an indexing page may state a later online-publication date for digitized classic work; preserve the original printed year and version history. Metadata-verified is not full-text-processed. Distinct publication lineages must not be overcounted simply because an article is mirrored, translated or cited by a later review. The academic source rows do not by themselves establish the listed models' relevance to every possible confined geometry.

### 10.1 Major unresolved lineage families to acquire

- Rotating-cylinder/end-wall driven vortices and Ekman pumping; experiments before and after modern PIV.
- Escudier-era confined vortex breakdown and circular tube/expanding duct work, including true original publication dates and geometry.
- Canonical cyclone, Lapple/Stairmand/Barth-type design histories, original geometry sources, vortex finder and axial short circuit.
- Gas/steam vortex diodes and nuclear passive safety valve tests with full pressure–flow direction definitions.
- Swirl combustor precessing-vortex-core studies, instability diagnostics and wall/outlet acoustic coupling.
- Counter-rotating and antiparallel vortex reconnection experiments and DNS, including Melander–Hussain and modern independent work.
- Microfluidic tangential chambers and low-Re counterexamples where inertia-based breakdown is absent.
- Hydrodynamic vortex cavitation, aerated Venturi/ejector and bubble-generation claims with phase-resolved evidence.
- Fluidic oscillators with actual feedback topology versus apparent oscillation due to downstream compliance.
- Patent genealogy from pre-1960 fluidics through 1960–1990 vortex control and modern microdevice filings.

## 11. Illustrative evidence and hypothesis discipline

| Example question | Supported statement level | Unwarranted shortcut | Smallest decisive measurement |
|---|---|---|---|
| Does tangential injection produce a vortex? | Tangential momentum is supplied if flow direction and aperture are known | A titled tangential slot guarantees a coherent core | Wall/core velocity map plus bypass check |
| Is the center low pressure? | Conditional radial balance supports inward reduction under specified swirl | Low center pressure or cavitation follows from visual rotation | Static pressure map with outlet pressure |
| Has vortex breakdown occurred? | Source-specific reverse axial flow/topology and state transition | Loud turbulent sound identifies breakdown | Time-resolved axial velocity and stagnation topology |
| Do opposed inlets reconnect vortices? | Competing signed momentum and shear may occur | Counterrotation guarantees vortex reconnection | 3D vortex-line topology or validated time-resolved field |
| Is a tone a vortex frequency? | Sound reflects excitation and acoustic path | A 7–9 kHz peak identifies KH or vortex precession | Matched controls, flow scaling and tube/recording chain changes |
| Does a patented vortex valve outperform a baseline? | Patent discloses a construction and claims function | Patent grant proves superior efficiency | Independently measured comparable pressure–Q curves |
| Is a vortex finder optimal by one ratio? | Ratios organize geometries of comparable topology | Common cyclone ratio transfers to sphere | Multiple diameters/depths, leakage checks, pressure/flow mapping |

## 12. Work program, completion and handoff

P0 — **Research architecture and seed synthesis (this edition):** establish controls, taxonomy, search matrix, priority physics, history, source discipline, master chapter architecture, and seed catalog. Status: Complete with Gaps — the comprehensive corpus is not yet acquired.

P1 — **Stratified academic discovery:** 20 unique candidate academic records per batch, focusing in early batches on historical vortex theory, confined breakdown and end-wall studies, then branches of interactions, device engineering and acoustics. Record novelty, lineage, date, full-text status and accepted/reserve decisions.

P2 — **Patent genealogy:** batches by 1960s control-fluidics, 1970s–1980s vortex valves/diodes/amplifiers, cyclone and vortex finder implementations, and post-1990 microscale and multiphase inventions. Link families, cited prior art and independently corroborated performance.

P3 — **Access and complete source processing:** full original studies at 5/batch, full patent family and drawings at a manageable batch size, with separate geometry/parameter configurations.

P4 — **Mechanism synthesis and historiography:** reconcile definitions and data, produce independent-lineage coverage matrices, identify chronological breakthroughs and unresolved controversies.

P5 — **Quantitative regime atlas:** source-defined onset/developed/cessation/hysteresis envelopes, geometry transfer restrictions and normalized design matrices with bounded uncertainty.

P6 — **Experimental and comparative device atlas:** maintain separate project device-state and audio baselines, use actual geometry and modification delta maps, run smallest discriminating tests.

P7 — **Publication audit and monograph revision:** reconcile citations, inspect primary figures, check numerics, record contrary evidence, ensure reproducibility and issue a labeled edition with limitations.

**Exact next task:** CVD-P1A-01, historical and theoretical vortex-motion discovery (1858–1949) with 20 **new** screened source records, no invented fill. Prioritize original Helmholtz, Kelvin, Lamb, viscous-vortex and wall/boundary-layer lineages; distinguish direct classic texts from translations and reviews. Continue from Research_Status_and_Next_Batch.md, preserve this version, and update the source ledger with canonical identifiers, stable URLs, original date, classification and transparent inclusion decision. A later batch will focus specifically on historical patents rather than treating theory and patents as one evidence class.

## 13. Explicit caveats and future update rules

The present edition contains a **verified seed catalog** and an extensive analytical framework, not a completed systematic 1858–2026 literature synthesis. Discovery-stage claims are descriptive; no primary full-text quantitative extraction or comprehensive patent claims analysis was completed here. Academic and patent work is cross-tagged but not averaged. This research program remains open to additional physics from the project geometry, contradictory evidence and new terminology.

For every substantive revision, record date, previous claim, new claim, reason, evidence identity, change in confidence, affected geometries, and any previously accepted result that was superseded. When a dimension or operating condition is missing, use Unknown and a sensitivity relation, not a fabricated central value. Where a proposed named mode cannot be discriminated, retain competing hypotheses and specify the smallest test.



## 14. Edition 0.2 — APG and fluidic-oscillator expansion (2026-11-16)
The source-driven P1A-01/APG-01 supplement is `P1A_01_Historical_and_APG_Oscillator_Batch.md`. This extends rather than replaces M01–M12/G01–G16.

**New tags:** M13 = adverse-pressure-gradient boundary-layer separation, reattachment and diffuser load; M14 = passive flow-state bistability, Coanda switching, feedback and time-delay. G17 = streamwise APG diffuser or external separated surface; G18 = jet-driven acoustic cavity/Helmholtz element; G19 = feedback-free interacting-jet chamber.

**Causal division:** dp_e/ds > 0 along local near-wall external flow may promote separation but does not guarantee it. Keep it distinct from radial swirl pressure balance and device total pressure loss. Feedback-loop oscillators, interacting-jet self-oscillators, captive-vortex spin-up/delay elements, jet-driven acoustic cavities and steady APG-separated flows require separate port/topology diagrams, feedback paths, pressure/velocity maps and smallest discriminating tests. A fluidic oscillator can energize a separately located external adverse-gradient boundary layer without establishing APG inside its own chamber. Preserve geometry, alternative stationary states, flow reversal/blockage, source-defined parameters, measurement uncertainty and matched acoustic baseline.

**Provenance:** F01–F09 catalog entries include first-page-inspected user PDF archive sources, publisher-verified papers, and patent disclosures. No original numerical threshold or named acoustic mode is transferred to the project apparatus without matching geometry, forcing and observables.

## 15. Edition 0.3 — Historical P1A-01b and APG-02 source screening (2026-11-16)

The companion evidence record is **P1A_01b_APG_02_Source_Batch.md**; the cumulative source table is Source_Catalog.csv. Six new historical originals (H16–H21) complete a **20-original-paper discovery checkpoint** from 1858–1949, exclusive of duplicate seed Helmholtz/Kelvin and the Lamb revised edition. APG source screening adds F10–F29 (16 publications and four patent disclosures), for 29 APG source records and 65 catalog entries in all. These numbers represent *screened bibliographic entries* rather than full quantitative extraction or independent laboratory replication.

**Scientific emphasis.** Keep separate the streamwise adverse gradient dp_e/ds>0, radial swirl pressure gradient, device pressure losses, feedback-channel acoustic pressure fluctuations, wall-layer separation/reversal, and vortex-core axial breakdown. The newly screened literature includes diffuser partial stall (Moses–Chappell), separation criteria (Simpson), external periodic separation control (Seifert, Amitay–Glezer), oscillator feedback bubble growth (Bobusch, Woszidlo), pressure-wave feedback (Bergadà et al.), chamber-length-dependent oscillation cessation (Chen et al.), and historical resistor/capacitor relaxation circuits (four separate patent leads). They are not interchangeable mechanisms.

**Source independence.** Dean 1927 and 1928 are two original publications from one investigator; Bobusch 2013, Woszidlo 2015 and Bergadà 2021 partly share institutions/authors. High-confidence transfer to confined prototype geometry requires source-defined coordinate, true inlet/outlet and seals, feedback connections, downstream impedance, and matching measurable flow states. A tone, cavity or flow reversal alone does not identify a named hydrodynamic or acoustic instability.

**Next:** CVD-APG-03 up to five quantitative full-text geometry-specific extractions across separate mechanism families; CVD-P1A-02 early confined-wall and translated-history verification; independent priority-family claims/drawings audit. No quantitative full-text completion claimed by edition 0.3.


## 16. Edition 0.4 — APG-03 Original-Source Quantitative Extraction (2026-11-16)

**Companion primary-source dossier:** `APG_03_Quantitative_Original_Source_Extraction.md`. **Normalized individual tested configuration ledger:** `Source_Configuration_Ledger.csv`. **Catalog:** `Source_Catalog.csv`.

Five original full texts have been inspected at the level of selected reported numerical data, geometry/measurement definitions, figures/tables and alternative operating regimes: **R01 Reid 1953; F02 Tesař 2015; F05 Tesař 2019; F06 Abdrashitov–Marfin–Plakhova 2021; F09 Löffler–Ebert–Weiss 2021**. The source registry now has **66 identities**, including the newly cataloged R01. The configuration ledger has **13 version-specific apparatus/operating-condition records**. Figures that could not be machine-digitized are flagged as such: no claim of an exhaustive tabular or raw-data harvest.

**Physical evidence that materially refines the synthesis:**

1. **True streamwise adverse pressure gradient and diffuser pressure recovery are independent of mean swirl.** Reid's 1953 original experiments held inlet dynamic pressure at 60 lbf/ft² for 22 plain diffusers and investigated asymmetric but unseparated states, pressure recovery, exit extension and central partitions. Source-defined C_PR=(p2-p1)/q1 and area ratio R=A2/A1; never confuse this R with Reynolds number or use an inlet-to-outlet total pressure loss as a local APG.
2. **A passive wall-attachment/feedback oscillator can have multiple frequency regimes at the same geometry.** Löffler et al.'s nominal actuator (power jet 15.12 mm², settling chamber maximum 53.67 mm², nominal outlet 30.24 mm²) reports reference-case frequencies 2,360 Hz at 2 g/s versus 545 Hz at 4 g/s, with hysteresis. Its two actual feedback paths and source-defined St_FO=fL_FL/v_jet are essential, and the external aerodynamic separation-control boundary layer must not be mistaken for an identical APG inside the actuator.
3. **Captured-vortex spin-up is a distinct delay mechanism with source-specific experimental scaling.** Tesař 2019's D=52.3 mm, h=2 mm sealed plate pocket produced 11.7–45.26 Hz frequencies; source-defined Te=πfD²h/(4v mdot), with source data mean 0.596±0.033 (reported pointwise SD, n=30). This is not proof of the same mechanism in a two-jet oscillator.
4. **A jet-driven acoustic cavity can oscillate without tangential swirl.** Abdrashitov et al. 2021 used an axial nozzle, finite cylinder and coaxial outlet with a large vacuum reservoir. Source nominal Sh_L=fL/W and Re_L=LW/ν, with acoustic frequency measurement error about 0.4%. Its jet-tone and zero-flow cavity eigenfrequency must be kept separate.
5. **An oscillator's useful outcome can fail while it continues to switch.** Tesař 2015 reports approximately 0.6 mm bubble images with flow reversal at an aerator but failure of jet-pumping when hydraulic load/submergence increases. A U-tube/vent/jet pump architecture has hydraulic energy storage and is not a captive vortex or a simple two-feedback-loop oscillator.

**Evidence boundary:** reported measurement, authors' numerical solutions, source theory, and analyst inference have distinct markers. Source F17 compressible DNS remains abstract-index accessible but **not** fully inspected, so its detailed feedback pressure-wave field is a next-batch dependency. The source PDF/HTML originals were not attached to the repository; their published or local-archive locators remain in the catalog/dossier.

**Next program:** CVD-APG-04 for the missing F17 original, independent phase-resolved PIV, original Reid table extraction and F02 accumulator dimensional-model audit; patent claims/family work is parallel P2, and early historic walls continue under P1A-02.
