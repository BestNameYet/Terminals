# Confined Vortex Dynamics — Research Status and Next Batch

**Edition 0.5 (2026-11-16/17)** — Revised Terminal MCP Procedure -r, **nonce c5ea9b31-2907-45ca-863b-e76877ebf145**. Master: Confined_Vortex_Dynamics_Master.md Section 17. Research dossier: APG_04_Primary_Source_and_Mechanism_Audit.md.

## Current evidence and extraction checkpoint

| Measurement | Verified at this edition | Constraint |
|---|---:|---|
| Unique original source catalog entries | **68** | 66 prior plus original NASA R02 (2014) and R03 (2015) |
| Original historic H-series works counted | **20** | 21 H records including H15 revised edition, excluded from original-work count |
| APG/oscillator F-series screened entries | **29** | F01–F29, not independent laboratory count |
| Primary original texts with bounded quantitative evidence extracted | **9** | Prior F02, F05, F06, F09, R01 plus F11, F17, R02, R03 |
| Source configuration-specific ledger records | **38** | Prior 13 plus 25 source-defined F11/F17/R02/R03 variants |
| Reid 1953 table data transcribed | **32** | 22 original Table II + 10 original Table III; **3 need original scan re-verification** |
| NASA Koklu 2015 original parameter cases transcribed | **12** | Four separate Tables 2–5, includes fixed Cmu and fixed Cpi controls |
| Reprocessed full original patents / verified performance | **0** | Five original patent priority/topology leads, not completed claims genealogy |
| Project-device acoustic baselines or geometry modifications measured | **0** | Do not generalize source frequency onto project apparatus |

## Completed APG-04 source task

- F17 Bergadà et al. 2021 original full JATS XML accessed; source model 3D DNS two feedback channels, 65/97 m/s power nozzle, 12,410/18,617 nozzle Re; baseline computed switching frequencies 275.4/410 Hz and separate higher fluctuation states. Mesh sensitivity 0.96% medium/fine for baseline selected case; matching physical flow validation not demonstrated.
- F11 Koklu/Melton 2013 original NASA PDF inspected; true experimental HWA/PIV and naturally sweeping free jet 225 Hz at 4.54g/s; externally solenoid-driven modified mode 105 Hz at same mass rate, not a natural mode. Ambient quiescent, no external APG.
- R02 Koklu/Owens 2014 original NASA source: external separated ramp and controlled sweeping/straight/angled jet comparison under external adverse pressure gradient, wall pressure and oil-tracer interpretation.
- R03 Koklu 2015 original NASA source: geometry/actuator scale cases under two distinct input equalizations. AR1 at fixed Cmu f=110 Hz vs fixed Cpi f=264 Hz is a direct counterexample to a geometry-only law.
- Reid 1953 complete original tabular transcription into QA CSV; **three arithmetic flags** (R01-TII-05, R01-TII-17, R01-TII-19) require visual original scan check; other 29 records only passed internal consistency. No fabricated fixes.
- Tesař F02 source printed hydrostatic head Eq8 ΔP=gΔH has dimensional ambiguity requiring density for pressure; source Eq9 U-tube effective length definition remains unresolved.
- Patent F26–F29 and Zalmanzon US3295543A audited at preliminary priority/topology level only; patents do not measure effect.

## Most important verified physical distinctions

1. A fluidic oscillator may have **actual feedback channels** (F11,F17), whereas a captive-vortex delay (F05), axial jet acoustic cavity (F06) or monostable hydraulic U-tube accumulator (F02) has different connectivity and energy storage.
2. R02/R03 favorable **external APG separation control** does not prove the same adverse streamwise gradient inside the oscillator chamber. In the ramp, define s along attached upstream flow and compare p_e(s) and near-wall topology; in the oscillator, separately name internal jet axis and control-channel pressure stations.
3. F17 DNS vortical Q structures are a source-specific computational visualization, **not** experimental evidence of named vortex breakdown, Kelvin–Helmholtz edge tone, or cavity resonance. F11 PIV observes a free jet, not full-volume three-dimensional vortex lines.
4. Source-specific Strouhal, Reynolds and pressure-efficiency numbers must retain their reference diameters, velocity, pressure taps, actual flow split and source forcing; don't collapse nine papers into one scalar onset.

## Exact next bounded task: CVD-APG-05

1. **Image verify Reid table three flagged cases** against original NACA TN2888 pages 48–49 (printed page numbers). Record source image/page, source transcription change if any, recalculated arithmetic, and provenance. The primary PDF screenshot service returned a cache miss for this document; verification must remain pending until an original image is accessible.
2. **Finish independent phase-resolved geometry analysis** for two-feedback F17 against original F11 physical experiment, explicitly noting different original devices and lack of matched geometry. Verify time-phase, pressure vs convective momentum force term, numerical grid/model sensitivity, feedback length and downstream impedance.
3. **Retrieve restricted F10 Bobusch 2013** full original institutional paper or authorized manuscript; publisher/index abstract does not qualify for a tenth extract. Overlapping author/institution lines with F17 must be traced rather than counted as independent laboratory replication.
4. **Patent genealogy P2:** original Zalmanzon USSR line and US3295543A, full independent claims/priority equivalents, then F26–F29; distinguish legal publication date from physical testing. Do not infer performance from issuance.
5. **Dimensional / scaling harmonization:** source-specific Re/St, source head/pressure definition in F02, and controlled mass-flow or power regimes in NASA R03. Consider adding a verified raw time/pressure digitization only after image quality checks.
6. Proceed to a project-specific experimental delta map only after choosing the exact physical baseline device and recording all solids, seals, apertures, bypasses, outlet impedance, and acoustic recording state.

**Publication verification:** GitHub commit and revised Procedure -r terminal completion require separate checks, not inferred from a writer return. No unverified universal onset critical Re, Strouhal or acoustical mode is asserted.
