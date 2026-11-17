# CVD-APG-05A — Reid 1953 Original Table II Image Audit

**Date:** 2026-11-16 (Pacific). **Original Procedure nonce:** 50920d4e-c065-407c-91f8-6a1417a6ba29. **Basis:** APG-04 source transcription in Reid_1953_Diffuser_Tables_II_III_QA.csv.

## Primary source and verification method

Elliott G. Reid, *Performance Characteristics of Plane-Wall Two-Dimensional Diffusers*, NACA Technical Note 2888, February 1953, [original NASA report](https://ntrs.nasa.gov/api/citations/19930083792/downloads/19930083792.pdf). Table II printed p48 (PDF page index 49): original page image visually inspected in APG05. A separate nine-column numeric transcription of the 22 plain symmetric cases was compared against the published APG04 CSV record-by-record. All 198 numeric cells matched. No numeric field in any of the 32 existing source records was altered. Table III printed p49 (PDF index 50) screenshot returned cache miss during repeated requests; its ten original transcribed records retain their prior verification status.

Reid Eq. 29 (printed p37) relates the ideal-equivalent effective area ratio, volume efficiency and recovery coefficient:

    R_e = eta_v R = (1 - C_PR)^(-1/2).

Here R=A2/A1, C_PR=(p2-p1)/q1, eta_v=R_e/R. R_e in this source is NOT a Reynolds number. The equivalent diffuser area interpretation and measured static pressure recovery are not independent measurements of all three coefficients. Source q1=60 lbf/ft², nominal inlet width 4 in and height 32 in; air, thin turbulent inlet layer and large downstream plenum. Geometry angle is included divergence, not half-angle. The original scan confirms that all three prior arithmetic flags are printed-source inconsistencies rather than transcription defects introduced during APG04.

| Record | R | Printed C_PR | Printed R_e | Printed eta_v | Calculated R_e from C_PR | Calculated eta_v from printed R_e/R | Calculated eta_v from C_PR and R |
|---|---:|---:|---:|---:|---:|---:|---:|
| R01-TII-05 | 2 | 0.667 | 1.738 | 0.869 | 1.73292 | 0.86900 | 0.86646 |
| R01-TII-17 | 3 | 0.710 | 1.866 | 0.662 | 1.85695 | 0.62200 | 0.61898 |
| R01-TII-19 | 1.75 | 0.619 | 1.620 | 0.832 | 1.62008 | 0.92571 | 0.92576 |


**Interpretation and limits.** For TII-05, the printed effective-area and volume-efficiency pair agree with one another (1.738 / 2 = 0.869), but not with the printed recovery value via Eq. 29. For TII-17, both the printed effective-area/recovery pairing and the printed volume efficiency differ from Eq. 29; TII-19 has a compatible recovery/effective-area pair but a substantial volume-efficiency discrepancy. The cause (calculation variant, typographical error, earlier rounding or another undocumented issue) is not established; rounding at the printed precision alone cannot account for the principal mismatches. The recomputed values are analyst-derived algebraic alternatives, not corrected primary measurements.

The other 19 Table II rows passed the prior APG04 tolerance checks and match the printed page, but this does not guarantee agreement under every stricter rounding test, validate the original instrumentation, or reconcile every derived coefficient. APG04's prior flag rule uses a 0.003 effective-area residual and 0.005 volume-efficiency residual; it is a triage rule, not an uncertainty model. The original experiment reports separately bounded pressure error (near/under-optimum, about ±0.01q1; some unsteady means may differ up to 0.03q1). Those measurement uncertainty estimates do not justify altering the printed coefficient identity.

## Implication for project research

Pressure recovery, inferred effective flow area, volumetric efficiency and wall separation must stay distinct. A static pressure recovery coefficient alone cannot establish a local adverse pressure gradient at a particular wall location, nor the presence of a named vortex. Controlled geometry comparisons must track divergent and parallel sections, separation state, divider supports, downstream plenum, and actual open area. No new project apparatus or audio interpretation is attempted.

## QA and next steps

- All 22 original Table II rows image-matched, with 3 image-confirmed printed inconsistencies preserved; 19 rows retain prior arithmetic-pass status.
- Ten Table III records unchanged; original page image remains inaccessible in this pass.
- Underlying exact cause of printed discrepancies is unresolved. Independently retrieve original Table III image and, if relevant, compare Reid's figure 23/24 contours and source calculation notes. Do not infer corrected measurements from algebra alone.
- See APG05 complementary feedback mechanism report and edition 0.6 research handoff.
