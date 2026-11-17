# CVD-APG-05B — Comparative Feedback, Separation and Pressure-Force Mechanisms

**Date:** 2026-11-16 (Pacific). **Revised Procedure nonce:** 5bf3e759-fb4f-452e-b9a5-3a7a17a562e7. Companion original Procedure: 50920d4e-c065-407c-91f8-6a1417a6ba29.

## 1. Evidence and scope

This bounded checkpoint resolves F10 primary-text access and adds selected original-source quantitative evidence, revisits the F17 source table and force decomposition, and integrates APG05A's diffuser image QA. It is not a new physical experiment. Source F10 is the author-uploaded complete article text and accessible table reproduced on ResearchGate (upload credited to J. M. Bergadà, 2014-08-27); publisher/UPC PDF access had been restricted in APG04. Original figures are described by source text/captions; no full-resolution field digitization or exact concealed geometry reconstruction is claimed.

- F10: Bobusch, Woszidlo, Bergadà, Nayeri & Paschereit (2013), *Experiments in Fluids* 54:1559, DOI [10.1007/s00348-013-1559-6](https://doi.org/10.1007/s00348-013-1559-6), [author-uploaded original text](https://www.researchgate.net/publication/257403830_Experimental_study_of_the_internal_flow_structures_inside_a_fluidic_oscillator), sections 2–5, Table 1 and described Figs. 3, 8–12. Evidence E.
- F17: Bergadà, Baghaei, Prakash & Mellibovsky (2021), *Sensors* 21:5768, DOI [10.3390/s21175768](https://doi.org/10.3390/s21175768), [complete archival original JATS XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8434574/fullTextXML), retrieved HTTP 200 (163372 bytes) in this phase; Eqs. 1–2, original Table 1 and modeled comparisons in Figs. 8–16. Numerical simulation evidence, not a new matched experiment. F10 and F17 share Bergadà and a related investigator lineage; do not count them as independent replication.
- F11: Koklu & Melton (2013), [NASA AIAA 2013-2477 original](https://ntrs.nasa.gov/api/citations/20140000479/downloads/20140000479.pdf). Prior APG04 selected extraction concerns external free-jet characterization, not the same internal apparatus. Retained as a comparator rather than a second new extraction.

## 2. F10 original test configuration and measurement ledger

Define x from the square power nozzle toward the outlet throat, y across the nominal symmetry plane and z normal to the mid-depth observation plane. The solid acrylic internal blocks and inlet wedges bound the mixing chamber; two feedback passages each connect the downstream collection region to an upstream side of the power nozzle. A downstream divider separates two distinct discharge regions. The supply is pump-driven water through a needle valve and flowmeter in a closed-loop tank; the oscillator was immersed 40 outlet diameters below the surface. The authors explicitly distort the illustrated geometry and omit transverse coordinates owing to patent status. Thus the actual cavity depth, passage lengths and detailed wall angles cannot be inferred from the published sketch.

| F10 operating case | Water Q (L/h), source | Power-nozzle Re, source | Scope |
|---|---:|---:|---|
| F10-W-01 | 80.9 | 8711 | Flow-rate/frequency series |
| F10-W-02 | 103.5 | 11152 | Flow-rate/frequency series |
| F10-W-03 | 126.3 | 13593 | Flow-rate/frequency series |
| F10-W-04 | 148.8 | 16034 | Detailed phase/pressure discussion |

Table 1 is the exact source for Q and Re. Re uses the square power-nozzle hydraulic diameter (equal to its width), water bulk flow and viscosity; not the chamber diameter. The frequencies from Fig. 7 are not digitized here. The paper reports a proportional trend between Q and dominant oscillation frequency over these conditions; this is not a general onset threshold. The detailed phase discussion is at Q=148.8 L/h.

Measurement facts: twelve internal static-pressure locations were sampled in reference-aligned pairs (unused taps sealed); two ±1 bar sensors with 12 mm long, 1 mm bore connecting tubes; 64 s at 2048 samples/s; 16-bit acquisition; reference pressure at outlet depth in still water. Mid-depth planar PIV: 750 image pairs per Q, about 4.5 Hz irregular sampling, 0.56 mm spatial resolution. The downstream hydrophone did not provide a sufficiently clean trigger. POD, not high-speed instantaneous sequence tracking, reconstructed phase bins from snapshots. Main phase bins ±5°, and reported pressure/velocity phase alignment uncertainty at most 5° under the authors' alignment method. These are sampling/phase-resolution specifications, not an invented pressure calibration uncertainty.

## 3. F10 source observations versus physical interpretation

At a fully attached lower-wall jet state (defined 0° in the paper), the zone immediately behind the lower inlet wedge is recirculating. Deflected flow enters the downstream end of the lower feedback passage. Across the subsequent quarter-cycle the upstream return feeds the near-wedge separated region and the jet deflects away from the lower side. At 180° the corresponding configuration is reflected to the opposite wall. The source reports reversal of flow in a feedback channel during the opposite half-cycle, with pressure gradients changing accordingly. The source derives the phase relation between MP3 and MP5 from measurements and compares it with a convective timescale. The MP6/MP7 chamber signals and MP8/MP9 near outlet-throat stagnation regions reflect different locations, not a single uniform chamber pressure.

A centerline pressure observable can have twice the frequency of a single discharge-port pressure because the main jet crosses that plane twice per full cycle. F10 reports approximately 15 kPa mean centerline static-pressure difference between power-nozzle and outlet-nozzle stations; it is a station-specific quantity, not a local APG measurement or universally transferable total-pressure loss. The near-outlet planar velocity and integrated flow amplitudes are uncertain owing to optical refraction.

The inactive discharge region contains recirculating flow that entrains fluid back from downstream; attached external tubing had previously inhibited oscillation for this device lineage. Therefore the outlet is part of the coupled system. Increased outlet resistance or inertance can change the feedback split and the switched state, not merely the audible amplitude. This is a physically relevant analogy to project devices with attached tubes or compliant volumes, but the exact two-outlet geometry must not be assumed for a sphere or PEX tee.

Source authors favor separated-region growth supplied by return flow rather than pressure-wave propagation as the primary switching chain for this water apparatus. This is an interpretation supported by their planar phase-reconstructed velocity fields and pressure observations; it does not exclude pressure forces, rapid pressure adjustment, other three-dimensional flow, or all high-frequency disturbances. Their 2048-Hz sample rate gives an analyst-derived 1024-Hz Nyquist frequency; it cannot test the 7–11 kHz fluctuations reported in a different air simulation without changed instrumentation. POD resolves phase-coherent structure statistically, not a fully time-resolved three-dimensional mechanism. Exact pressure phase wave speeds, full vector traction and raw field uncertainties have not been extracted.

## 4. F17 complete original Table 1 revisited

F17 is a finite-depth two-feedback-channel compressible air DNS with power-nozzle speeds 65 and 97 m/s, lengths L, 2L, 3L, 9L; source nozzle Reynolds numbers 12410/18617 and Mach 0.188/0.282. Its baseline modeled switching is 275.4/410 Hz, respectively. These low-frequency coherent switching values are distinct from the high-frequency fluctuation values selected in Table 1. The paper compares calculated propagation spacing d=c/f with spacing estimated from its numerical pressure fields; these are **simulation-derived observations**, not laboratory measurements. At 65 m/s and 9L, the source uses the first harmonic of the spectral component having maximum amplitude. Exact high-frequency selection, local temperature and zone differ; don't relabel all eight frequencies as outlet oscillation modes.

| Nozzle U (m/s) | Feedback length | Source selected f (Hz) | Calculated d (mm), source | Spacing measured in model field (mm), source | Analyst difference (model field − calculated, mm) | Analyst relative difference (%) |
|---:|---:|---:|---:|---:|---:|---:|
| 65 | 1L | 9970 | 34.6 | 32 | -2.6 | -7.51 |
| 65 | 2L | 8012 | 43.2 | 45 | 1.8 | 4.17 |
| 65 | 3L | 7292 | 47.4 | 46 | -1.4 | -2.95 |
| 65 | 9L | 8024 | 43.2 | 42 | -1.2 | -2.78 |
| 97 | 1L | 9714 | 35.7 | 33 | -2.7 | -7.56 |
| 97 | 2L | 10008 | 34.7 | 36 | 1.3 | 3.75 |
| 97 | 3L | 10550 | 32.9 | 35 | 2.1 | 6.38 |
| 97 | 9L | 8250 | 42.1 | 40 | -2.1 | -4.99 |

The source models sound speed using ideal gas thermodynamics. The eight comparisons agree in spacing to an absolute relative difference of roughly 2.78–7.56% (analyst arithmetic), which is evidence for propagating pressure disturbances in that modeled system; it is not a frequency prediction for the project. The source also finds high internal spectral components need not appear strongly at the oscillator outlet. Numeric table values are transcribed from the complete original XML, not digitized from an uncertain image.

### F17 source Eqs. 1–2 and force interpretation

The authors decompose the scalar momentum/force expression across a feedback exit into a convective term and pressure term: M = mdot V + p A = mdot²/(rho A) + p A; discretized contributions sum rho_i V_i² A_i and p_i A_i over surface elements (with the source's exit comparison conventions). For the reported baseline and 9L end cases at both supply velocities, Fig. 14 and its discussion describe the net pressure contribution as more than an order of magnitude larger than the mass-flow term. In their model, alternating impingement/stagnation sites at chamber converging walls and feedback-exit surfaces launch disturbances, which may propagate in opposing directions and reflect at channel boundaries. Frequency agreement across modeled wall pressure, feedback force, and outlet mass flow supports coupling, not by itself direction of causality.

**Analyst control-volume clarification:** for an actual three-dimensional control volume the appropriate traction term is -integral(p n)dA, the advective term is integral(rho u(u·n))dA, and the transient storage term is d/dt integral(rho u)dV; include wall shear and all inlet/outlet surfaces with signed normals and a stated pressure reference. A scalar sum of absolute pA on one section is not an independently general force balance. Pressure dominance is distinct from acoustic wave dominance: quasi-steady pressure redistribution can exert a large force without proving that a propagating wave sets the switching period. Conversely, feedback mass transport can feed a recirculation zone while pressure traction is locally responsible for deflection. This explains why the two proposed categories are not mutually exclusive at the governing-equation level.

## 5. Causal comparison and discriminating predictions

| Question | F10 water experiment | F17 compressible DNS | Next discriminator |
|---|---|---|---|
| Geometry | Outlet divider and coupled two discharge regions; concealed exact dimensions | Two return paths, specified length ratios, external outlet chamber; a different modeled configuration | Document CAD, all actual openings, depth, return-passage cross section, outlet impedance before claiming similarity |
| Primary interpretation | Advective return feeds growing separated region; phase-aligned PIV and pressure | Pressure-force imbalance and propagating disturbances within studied DNS topology | Simultaneous pressure/volume flow AND full chamber velocity at two return sections; phase and signed force balance |
| Period / fluctuation | Convective timing indication; centerline twice single-port cycle; no exact Fig. 7 values in this extraction | Baseline 275.4/410 Hz and 7.3–10.6 kHz selected internal fluctuations | Cross-spectral phase versus location; distinguish broadband/harmonic from traveling wave and low-frequency switching |
| Outlet perturbation | Downstream tubing can inhibit switching according to experiment context | Outlet and internal fluctuations can differ; long return paths weaken coherent response | Change downstream load with actual source flow, pressures, effective open area and feedback configuration held/documented |
| Evidence strength | Physical planar PIV + pressure; no full geometry or time-resolved volume | Complete model text and tabular data; mesh sensitivity previously extracted, no matched physical validation | Fabricate same topology and compare phase-locked pressure/flow across matched Re, Ma, area and impedance |

Do not conflate internal feedback-channel pressure gradients with externally imposed adverse streamwise gradients on a controlled ramp. For a named attached near-wall streamwise coordinate s, dp_e/ds>0 is the local adverse external pressure gradient; a radial swirl pressure gradient or source-to-exit loss is different. A jet switching between walls, even with alternating corner vortices, does not establish axial core vortex breakdown.

### Minimal project-specific experimental design (analyst proposal, not executed)

1. Reconstruct the chosen baseline in plan and section, including feedback path connectivity, pressure taps, all seals, any radial/axial bypasses, nozzle aperture, outlet restrictions and compliant volume. If a proposed return path is absent, this comparison cannot establish a feedback-channel mechanism.
2. At matched forcing and outlet load, measure or estimate bulk volume flux and inlet momentum for each path. Instrument at least two positions along the candidate return path and both chamber sides. Record absolute/differential pressure and synchronized outlet motion or velocity; define axial and transverse axes explicitly.
3. Compare propagation lag with both L/c and L/U_feedback, acknowledging reflections and memory. Measure pressure area traction and convective momentum including signs; check net momentum storage. Alter only path length first; then add resistance at fixed path geometry; document changed capture and losses. Block a path only with flow reallocation and changed pressure load measured. Vary downstream impedance separately.
4. Disconfirm pressure-wave predominance if phase changes follow advective transport and separated-zone growth under comparable load without a propagating-wave signature. Disconfirm pure transport timing if phase follows wave travel while coherent flow transport is too slow or absent. For competing mechanisms, fit both and map ranges where they coexist or switching ceases; do not label a vortex from a tone.
5. Acoustic comparison requires ambient/no-flow and exact matched-device baseline, synchronized flow dependence, sensor bandwidth and tube response. In particular, a 7–11 kHz source simulation neighborhood does not identify a project sound. No audio or matched project geometry was examined in this batch.

## 6. Remaining work

APG05A verifies Reid Table II image; Table III screen remains unavailable. APG05B adds F10 original text extraction and four operating cases; F17 Table 1 is revisited, without counting it again as a new source. Exact figures, phase-resolved raw data, full-volume source geometry, and matched experimental validation remain unextracted or unavailable. Separate independent-laboratory corroboration and patent-family P2 claim/priority tracing (including Zalmanzon and F26–F29) are unfinished. No acoustic mode or universal vortex onset is established.
