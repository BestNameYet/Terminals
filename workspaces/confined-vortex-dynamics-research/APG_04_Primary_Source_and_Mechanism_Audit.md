# CVD-APG-04 — Original-Source Quantitative and Mechanism Audit

**Research date:** 2026-11-16/17. **Program:** Confined Fluid Dynamics. **Revised MCP Procedure -r nonce:** c5ea9b31-2907-45ca-863b-e76877ebf145.
**Prior baseline:** master edition 0.4, 66 registered original bibliographic source identities, five original works previously processed at selected quantitative extraction level, thirteen configuration records.

## 1. Scope and evidence boundary

This report extends the systematic evidence program rather than replacing its original figures and quantitative baselines. Four new original publications have been inspected for source-defined quantitative findings: F17 Bergadà et al. 2021 (compressible feedback-path 3D direct numerical simulation), F11 Koklu–Melton 2013 (NASA experimental sweeping-jet baseline), R02 Koklu–Owens 2014 (NASA external adverse-pressure-gradient separation control), and R03 Koklu 2015 (NASA geometry/forcing comparison in an external adverse-pressure-gradient ramp). R02 and R03 are new literature IDs but belong to the same NASA research lineage as F11; new papers are not independent institutions. F10 Bobusch et al. was restricted at the original institution: abstract and excerpts were accessible but original complete text was not; it is *not* newly counted as extracted. No acoustic recording or project physical apparatus was evaluated.

Three categories must be maintained separately: **E** direct apparatus observations (hot-wire, PIV, oil/pressure measurements); **N-U/N-V** computational DNS fields with internally assessed discretization, not automatically independent experimental validation; and **P** patent disclosure and claims. Source authors' mechanistic interpretations remain conditional where the measurements don't uniquely identify causes.

The meaning of adverse pressure gradient (APG) is flow-oriented: for streamwise external reference coordinate s, dp_e/ds > 0. It is different from (i) the radial pressure gradient in a swirling vessel, (ii) gross pressure drop between a source and an outlet, and (iii) time-varying pressure waves inside a feedback channel. The physical pressure stations and time phase must be stated.

## 2. F17: Bergadà, Baghaei, Prakash and Mellibovsky (2021) — compressible feedback DNS

**Original:** "Fluidic Oscillators, Feedback Channel Effect under Compressible Flow Conditions," Sensors 21(17), 5768, DOI 10.3390/s21175768. Full original archival JATS XML: https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8434574/fullTextXML ; original Figures 1–16 and Table 1.

**Solid / passages / inlet / outlet:** 3D jet supply nozzle, bounded mixing chamber with convergent walls, two physically connected *feedback channels* returning flow and/or propagating pressure disturbances toward opposing control ports, and downstream external/outlet chamber. Four channel lengths L, 2L, 3L, 9L (not equivalent loop path travel times simply because L scales; backpressure and reflection remain). Constant device depth = **0.00325 m**. Source-defined dimensions Ya=0.0237 m, Yb=0.0216 m, Xa=0.0198 m, Xb=0.0389 m, Da=0.00255 m, Db=0.0034 m; original Figure 3 controls placement. Numerical probe A=(0.06642,0.001693,0.00195) m and B=(0.06642,0.010157,0.00195) m.

**Fluid/forcing:** Newtonian compressible ideal-gas air. Source nozzle velocities **65 and 97 m/s**; nozzle-specific **Re=12,410 and 18,617**, Mach **0.188 and 0.282**. Source Re uses density × spatially averaged velocity × power-nozzle hydraulic diameter divided by viscosity, *not chamber diameter*. Reported F+ uses oscillation f and power-nozzle hydraulic diameter divided by power-nozzle velocity; preserve this definition before comparing F09. Operating Mach in the downstream constriction can exceed inlet Mach.

**Numerical evidence:** time step **2.25×10^-8 s**. Three baseline meshes **5,933,900**, **19,600,672**, **23,882,040 cells**, maximum y+ **23.86, 3.16, 2.6** respectively; medium/fine oscillation-frequency difference **0.96%**, coarse/fine **5%**. Study reports mesh-insensitive frequency as an *internal numerical* check; there is no matched independent experimental validation for that precise geometry. For the baseline at 65 and 97 m/s, computed outlet mass-flow switching frequencies **275.4 and 410 Hz** (Section 5.1, Figure 8). Longer feedback paths reduce coherent amplitude/frequency in the tested model, but at 9L substantial faster irregular fluctuations coexist with low-frequency motion. Source reports at 65 m/s/9L **251.6 Hz** lower switching and **1037.4 Hz** high fluctuation; at 97 m/s/3L **179.3 Hz** and **2401.8 Hz** respectively (Section 5.2). Do not identify the high-frequency fluctuation as a named acoustic mode merely because it is periodic.

**Mechanism hypothesis:** phase-alternating stagnation-pressure regions at mixing-chamber convergent walls generate pressure disturbances propagating along physical return passages. The original authors calculate the momentum exerted at feedback exits as a pressure force component plus convective mass-flow component and find the former larger in their modeled cases. The Q-criterion identifies 3D vortical structures but cannot establish classical axial swirling-vortex breakdown; a jet switching between walls may instead generate vortical shear layers and recirculation pockets. Distinct tests: feedback path blockage with flow redistribution measured, one-loop length change at matched source/exit impedance, pressure taps at both feedback mouths and convergent wall synchronized to jet phase. Experimental cross-validation remains outstanding.

## 3. F11: Koklu and Melton (2013) — experimentally measured free sweeping jet

**Original:** "Sweeping Jet Actuator in a Quiescent Environment," AIAA 2013-2477; NASA original full PDF: https://ntrs.nasa.gov/api/citations/20140000479/downloads/20140000479.pdf . Evidence **E**: hot-wire, 2D PIV and phase-conditioned modified-oscillator data, **not** external APG testing.

**Device construction:** ABS CNC body and cover glued/bolted to prevent leakage; nominal square exit **6.4×6.4 mm**, nozzle spread bounded by approximately ±50° sidewalls and two opposing Coanda surfaces. Physical feedback loops communicate alternating high-pressure/return flow toward the power jet; blocking them can lock either of two steady attached states. External high-speed solenoid modification changes the forcing state and is not the unmodified passive baseline.

**Reported numerical observables:** original mass flow **4.54 g/s** yields naturally sweeping **225 Hz**. Hot-wire sample rate **25.6 kHz** with **51,200 samples/location**. Source reports approx **2000 PIV image pairs**, velocity-width at x≈6 mm from exit **40.7 mm sweeping** vs **8.5 mm straight unoscillating** (~4.79× analyst ratio). At flow rates **2.27, 4.54, 6.81 g/s** source mean peak speeds **19.5, 39.5, 55.8 m/s**. Nominal hot-wire accuracy approximately ±2% under calibration range, potentially up to ±15% angular error when jet pitch approaches 50°. Reconfigured solenoid-driven flow at **4.54 g/s** oscillated at **105 Hz**, not naturally 225 Hz: source actuated and native states are not frequency equivalents at matched mass flow. The paper observes four switchable macrostates: upper-attached, lower-attached, straight, and oscillating. The external ambient is still/quiescent; no attached external ramp exists.

**Testable transfer:** lower+upper loop pressure and velocity distributions differ from a captive vortex pocket. At fixed mass flux, separate loop-blocked state from a forced symmetrical jet and from natural self-excitation; measure how loss and nozzle effective area change when feedback is blocked.

## 4. R02: Koklu and Owens (2014) — external APG ramp separation

**Original:** "Flow Separation Control over a Ramp Using Sweeping Jet Actuators," AIAA 2014-2367, original NASA full PDF https://ntrs.nasa.gov/api/citations/20160005089/downloads/20160005089.pdf . Evidence **E**, separate *external* control volume.

**Flow path:** independent sweeping-jet actuator array ejects into the near-wall boundary layer ahead of a fixed adverse-pressure-gradient ramp, NASA Langley **15-inch wind tunnel**, upstream speed near **140 ft/s** (42.7 m/s). Source comparisons include steady straight jet (STJ), steady angled vortex-generating jet (VGJ), unsteady sweeping jet (SWJ), and passive micro-vortex generator. The SWJ oscillator's internal feedback pressure is not the external ramp wall static pressure; an external adverse pressure gradient does not prove the oscillator interior has identical sign.

**Measurements:** surface taps with **0.020 inch bore**, additional laterally spaced taps, electronically scanned pressure sensor full scale **1 psid** and accuracy **±0.06 psi**, averaging **6400 signals per port**, with kerosene/aviation oil plus fumed silica surface-flow visualization. Source variables C_p (surface pressure), C_mu (jet momentum relative to freestream), and C_pi (input power measure) retain different reference areas/fluxes. Under reported matched operating comparisons, sweeping unsteady blowing improved ramp pressure recovery and reduced separated area more than straight/angled steady blowing. Authors interpret surface streaks as two alternating counterrotating streamwise vortex contributions vs one for angled jet; this remains source interpretation from near-wall surface and pressure measurements, not proof of volumetric vortex-line reconnection.

**Small decisive test:** vary *only actuator state* SWJ/STJ/VGJ at a recorded matched C_mu, repeat at matched C_pi, and preserve wind tunnel speed, wall static taps, source pressure, nozzle geometry, and downstream load. Mixing two power-control definitions defeats causal comparison.

## 5. R03: Koklu (2015) — actuator aspect and scale controlled comparisons

**Original:** "The Effects of Sweeping Jet Actuator Parameters on Flow Separation Control," original NASA/AIAA full PDF https://ntrs.nasa.gov/api/citations/20160006025/downloads/20160006025.pdf . **Same NASA investigator lineage as R02; different original dataset and experimental conditions**.

**Baseline:** three sweeping-jet actuator array ahead of the adverse-gradient ramp; reference nozzle **0.25×0.125 inch**, **AR=2**, approx 30° mounting pitch, reference 2.5-inch spacing; source surface pressure tap accuracy ±0.06 psi and sampling **6400 values/tap**. Two-dimensional PIV on selected states involves approx **1000 image pairs**; it does not reconstruct all components of full 3D vorticity.

**Four original numerical Tables 2–5:** full source-condition transcription in APG_04_NASA_2015_Actuator_Parameter_Tables.csv. At fixed **C_mu=0.4%** for AR4/AR2/AR1: measured f **238/178/110 Hz**, C_pi **1.15/0.78/0.48%**, respectively. At fixed **C_pi=0.8%** the same AR4/AR2/AR1 have f **215/178/264 Hz**, C_mu **0.32/0.40/0.56%**. Hence an alleged monotonic geometry-to-frequency rule depends on what the experiment holds constant: AR1 shifts from 110 to 264 Hz when forcing changes.

**Scale study:** at fixed C_mu=0.4%, scaling internal nozzle/cavity 0.3/0.6/1.0 yields **1537/406/178 Hz** with C_pi **1.33/1.09/0.78%**. At fixed C_pi=0.8% the same scale groups give f **1325/375/178 Hz**, C_mu **0.27/0.33/0.40%**. Pressure/control flow rates/velocity ratios in the companion table are *source values*, not predictions for other geometry. The best measured external APG separation-control performance need not coincide with highest free-jet oscillation rate.

**Comparison discipline:** pressure recovery and streamwise near-wall momentum on ramp are external; internal oscillator recirculation and feedback loop may differ. No universal onset Re, frequency Strouhal, or water equivalent follows by equalizing only a pressure supply.

## 6. Reid (1953) — original diffuser Tables II and III

**Original:** Elliott G. Reid, NACA TN 2888 *Performance Characteristics of Plane-Wall Two-Dimensional Diffusers* (1953), https://ntrs.nasa.gov/api/citations/19930083792/downloads/19930083792.pdf .

Machine-readable original-text transcription and arithmetic QA: **Reid_1953_Diffuser_Tables_II_III_QA.csv**. Table II has **22 plain two-dimensional diffusers**, Table III **10 modified geometries**. Variables include original entrance/exit width and length (W1=4 inch nominal; air q1=60 lbf/ft²), included divergence angle, area ratio R, C_PR static recovery, source effective area ratio R_e, pressure efficiency eta_p, volume efficiency eta_v, plus footnotes. Source definitions include R=A2/A1, C_PR=(p2-p1)/q1, ideal inviscid C_PRi=1-1/R², eta_p=C_PR/C_PRi. Geometry-specific local streamwise APG must not be substituted by overall C_PR.

**Matched original report comparisons** at source geometry: L31in, R3: central thin partition C_PR **0.754** vs plain **0.710** (+0.044 analyst difference), while central wedge gives only **0.716** (+0.006). Extended L44/R3.5 case to total 61in: **0.793 vs 0.766** (+0.027). Asymmetric 31in/R3 case: **0.675 vs 0.710** (-0.035). These comparisons have different changes to effective flow area and outlet plenum, not all equal to a blockage-only experiment.

**Quality check:** three original-transcription records **R01-TII-05, R01-TII-17, R01-TII-19** fail the internal coefficient consistency rules at the stated rounded precision. They are marked VERIFY_ORIGINAL_SCAN; the independent PDF image screenshot service failed with cache miss, so the original printed-value reading remains unresolved. The raw printed transcription is deliberately NOT silently modified; analyst-recomputed R_e and eta_v appear in separate columns. The remaining 29 rows pass internal arithmetic checks only; this is not full image/measurement-chain verification.

## 7. F02 (2015) original printed U-tube equation dimensional critique

**Original:** Václav Tesař, *Fluidic Generator of Microbubbles — Oscillator with Gas Flow Reversal for a Part of Period*, Acta Mechanica et Automatica 9(4), DOI https://doi.org/10.1515/ama-2015-0032 ; original user supplied PDF, printed pages 200–201.

The paper writes **ΔP = g ΔH** at original Eq. 8, defines g=9.81 m/s², and refers to the left side as pressure difference and ΔH as difference in U-tube arm liquid elevation. For ordinary ΔH measured in meters, g ΔH has dimensions **m²/s²**, *not pascals*. The separately derived hydrostatic law is **Δp = rho_l g ΔH**, or p/rho_l = g ΔH if ΔP is specific-pressure energy. There is no source excerpt establishing that ΔP in Eq.8 was divided by liquid density; therefore preserve the original equation and flag **unit-definition unresolved** instead of quietly inserting density.

The paper's Eq. 9 **f=(1/(2π))√(g/l)** has frequency dimension and could represent a conventional U-tube's restoring length when l denotes one arm/half the moving column. If l denotes total moving fluid length, conventional small-displacement ideal uniform U-tube gives **f=(1/(2π))√(2g/L_total)**; exact mapping depends on the original diagram and assumptions. The source's Fig8/9 two-arm schematic, Fig12 PMMA double-acting plate and early tests (Fig15) are not interchangeable measured states. High aerator resistance and deeper submergence can suppress useful reverse aeration, even when an oscillator still switches.

## 8. Original patent source lineages (provisional P2 audit)

| Source | Claimed invention topology | Earliest indexed priority |
|---|---|---|
| F26 Davis/Plessey [US3604443A](https://patents.google.com/patent/US3604443A/en) | Fluid resistor / capacity, bistable amplifier and analog response | 1968-11-28 |
| F27 Warren [US3016066A](https://patents.google.com/patent/US3016066A/en) | Control ports + two wall attachment states + regenerative feedback | 1960-01-22 |
| F28 Horton/Bowles [US3185166A](https://patents.google.com/patent/US3185166A/en) | Amplifier and stored-pressure/flow feedback; GB985700A family counterpart | 1960-04-08 |
| F29 Spyropoulos [US3217727A](https://patents.google.com/patent/US3217727A/en) | Pneumatic relaxation circuit with load/vent pressure switching | 1963-09-10 |
| Prior art Zalmanzon [US3295543A](https://patents.google.com/patent/US3295543A/en) | General pneumatic/hydraulic element control; Soviet historical lineage | 1959-12-15 indexed |

A patent grant is a construction disclosure and asserted operation, **not independently measured proof**. Priority dates and separate family members require original application crosschecks; don't declare an inventor's global-first priority from the five samples. F28 original claim counting remained inconsistent in indexing and must be separately audited.

## 9. Causal test and next phase

To isolate claimed mechanisms: (1) in two-feedback devices, compare L,2L,3L,9L at fixed power-jet and downstream pressure while measuring feedback pressure and flow, not only the output spectrum; (2) for the NASA ramp, control external APG and compare steady/oscillating at fixed C_mu then fixed C_pi; (3) in diffuser, compare central true partition vs wedge and extension, with exact aperture/area changes; (4) for F02 gas reversal, independently measure accumulator head, liquid column length, gas throughput and reverse flow—oscillation alone doesn't prove reversal; (5) for any named vortex or cavity mode, require time-resolved pressure/velocity topology and acoustically matched baseline.

**Next bounded task CVD-APG-05:** original-image validation of the three Reid tabular inconsistencies and digitization of a modest number of pressure/velocity plots; seek F10 inaccessible original PIV by author manuscript; inspect entire F17 Table1 and original model configurations for pressure-wave frequency/phase; independent fluidic-circuit patent-family and earliest Zalmanzon original priority; compare source-specific dimensionless definitions and formulate geometry-matched experiments. Keep quantitative completeness unknown where source figures cannot be inspected.