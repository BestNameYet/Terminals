# P1A-01 Historical Screening and APG/Fluidic Oscillators — Batch 0.2

**Date:** 2026-11-16. **Terminal MCP Procedure nonce:** 27a9b12e-8586-45d5-9fbb-7d1750cb9d5b. **State:** Historical discovery partial; first APG/oscillator source-screen checkpoint.

## Counts and validation boundaries
Original seed corpus: **15** (A01–A10 + P01–P05). Newly screened historical entries: **H01–H15 = 15 bibliographic publications**, but **H15 is an expanded revised Lamb 1895 edition of H01 Lamb 1879**, so **14 original-work candidates** count toward the P1A-01 goal of up to 20 novel originals. The archive and online APG/oscillator branch adds **F01–F09 = 9 entries**, specifically seven publications/reviews and two patent disclosures. **24 new CSV entries; 39 total.** All are source discovery/screening, NOT full text quantitative extractions. The Tesař source series is one investigator lineage, not separate independent corroborations. Helmholtz 1858 and Kelvin 1867 are existing seeds and not new entries. The source-defined original print dates supersede scanning/upload dates.

## Historic works and evidence classes
The historical series below is intentionally heterogeneous: an ideal vortex treatise is not the same experiment as a rotating annulus, an external turbulent pipe or a wall boundary layer. Each original claims only title/abstract/index-level relevance at this stage. A directly verified publisher/archival URL appears in the catalog and the generated table below.

| ID | Year | Title | Evidence | Original source / locator |
|---|---:|---|---|---|
| H01 | 1879 | A Treatise on the Mathematical Theory of the Motion of Fluids | T | https://www.biodiversitylibrary.org/item/58384 |
| H02 | 1878 | On The Instability Of Jets | T | https://londmathsoc.onlinelibrary.wiley.com/doi/10.1112/plms/s1-10.1.4 |
| H03 | 1879 | On the Stability or Instability of Certain Fluid Motions | T | https://doi.org/10.1112/plms/s1-11.1.57 |
| H04 | 1883 | A Treatise on the Motion of Vortex Rings | T | https://books.google.com/books?id=odIEAAAAYAAJ |
| H05 | 1883 | An Experimental Investigation of the Circumstances Which Determine Whether the Motion of Water Shall Be Direct or Sinuous | E | https://doi.org/10.1098/rstl.1883.0029 |
| H06 | 1888 | A Treatise on Hydrodynamics with Numerous Examples | T | https://books.google.com/books?id=LzUeTlYZtMUC |
| H07 | 1905 | Über Flüssigkeitsbewegung bei sehr kleiner Reibung | T | https://germanhistory-intersections.org/en/knowledge-and-education/ghis%3Adocument-202 |
| H08 | 1905 | On the Influence of the Earth's Rotation on Ocean-currents | T | https://library.metoffice.gov.uk/portal/Default/en-GB/RecordView/Index/180935 |
| H09 | 1911 | Über die Stokes'sche Formel und über eine verwandte Aufgabe in der Hydrodynamik | T | https://mathshistory.st-andrews.ac.uk/Extras/Oseen_Stokes_paradox/ |
| H10 | 1921 | Über laminare und turbulente Reibung | T | https://onlinelibrary.wiley.com/doi/10.1002/zamm.19210010401 |
| H11 | 1923 | Stability of a Viscous Liquid Contained between Two Rotating Cylinders | E | https://doi.org/10.1098/rsta.1923.0008 |
| H12 | 1935 | Statistical Theory of Turbulence | T | https://www.ams.jhu.edu/~eyink/Turbulence/classics/Taylor35a1.pdf |
| H13 | 1936 | Fluid Friction Between Rotating Cylinders I Torque Measurements | E | https://kestrel.nmt.edu/~rsonnenf/shared/Explosions_I_have_known/Taylor1936-Proceedings%20of%20the%20Royal%20Society%20of%20London%20A-Fluid%20Friction%20between%20Rotating%20Cylinders.%20I.%20Torque%20Measurements.pdf |
| H14 | 1948 | A Mathematical Model Illustrating the Theory of Turbulence | T | https://www.sciencedirect.com/science/article/pii/S0065215608701005 |
| H15 | 1895 | Hydrodynamics (Expanded Revision of 1879 Treatise) | T | https://www.biodiversitylibrary.org/bibliography/18729 |

## APG and oscillator records
| ID | Year | Title | Evidence | Original source / locator |
|---|---:|---|---|---|
| F01 | 2012 | Microbubble Generation by Fluidics Part I Development of the Oscillator | E | local-archive:cfd_oscillators_refset.zip!/tesar1_F.pdf |
| F02 | 2015 | Fluidic Generator of Microbubbles Oscillator with Gas Flow Reversal for a Part of Period | E | local-archive:cfd_oscillators_refset.zip!/Fluidic_Generator_Of_Microbubbles_-_Oscillator_Wit.pdf |
| F03 | 2017 | Taxonomic Trees of Fluidic Oscillators | R | local-archive:cfd_oscillators_refset.zip!/epjconf_efm2017_02128.pdf |
| F04 | 2019 | Time-Delay Circuits for Fluidic Oscillators and Pulse Shapers | R | https://www.mdpi.com/1996-1073/12/16/3071 |
| F05 | 2019 | Delay by Spin-Up of Captive Vortex | E | https://www.mdpi.com/1996-1073/12/17/3341 |
| F06 | 2021 | Experimental Study of the Jet-Driven Helmholtz Oscillator | E | local-archive:cfd_oscillators_refset.zip!/experimental-study-of-the-jet-driven-helmholtz-oscillator-54o29xtt79.pdf |
| F07 | 1977 | Jet-Driven Helmholtz Fluid Oscillator | P | https://patents.google.com/patent/US4041984A/en |
| F08 | 2000 | Feedback-Free Fluidic Oscillator and Method | P | https://patents.google.com/patent/WO2000023197A1/en |
| F09 | 2021 | Fluidic-Oscillator-Based Pulsed Jet Actuators for Flow Separation Control | E | https://www.mdpi.com/2311-5521/6/4/166 |

## APG–oscillator mechanism taxonomy and causal tests
Define s along the near-wall *external* flow and p_e(s) at the edge of that boundary layer: **dp_e/ds > 0** is an adverse pressure gradient. This sign does **not** by itself establish separation; verify wall shear stress, near-wall flow reversal, recirculation and reattachment experimentally. A radial positive pressure gradient within a swirl chamber, an overall device pressure drop and a streamwise APG are different quantities. In an oscillatory device, document the sign/time dependence in a named coordinate frame.

| Device family | Port/solid topology essential | Candidate mechanism | Small decisive comparison |
|---|---|---|---|
| Expanding diffuser or sudden expansion | Upstream throat, expanding walls, outlet/backpressure | APG separation and reattachment, losses | Wall taps, reversed near-wall velocity, varied outlet load |
| Coanda bistable amplifier with return channels | Actual supply/control ports, attachment wall(s), feedback loops and vents | Time-delayed jet deflection switching | Block feedback while accounting for changed flow; then change loop length |
| Feedback-free interacting-jet oscillator | Two angled jets in chamber, no externally connected feedback | Internal coupled recirculation/jet-switch states | Operate one jet at a time, then both; record pressure and PIV |
| Captive rotating-vortex delay | Tangential cavity pocket, capture/collector, load and wall friction | Vortex spin-up raises hydraulic load and sets switching/delay | Pocket blockage, onset/decay times, outlet restriction |
| Jet-driven Helmholtz cavity | Jet, volume/compliance, neck, upstream/downstream acoustic impedance | Jet-cavity coupling rather than necessarily core breakdown | Modify cavity volume/neck and compare pressure phase |
| Oscillator used for external separation control | Internal oscillator PLUS separate external boundary layer | Pulsed jets energize externally separated flow | Jet-off/on over identical external APG and same freestream |
| Swirling diffuser / core breakdown | Swirl input and a real axial path/exit | Axial stagnation/reversal vs ordinary wall separation | Axial velocity signs, outlet effects, swirl reduction |
| Static Coanda bistability | Power jet and wall geometry but no sufficient negative feedback | Two quasi-steady states, not oscillation | Pressure ramp up/down and time-resolved switching |

**False equivalences to prohibit:** a feedback-free jet cavity is not a two-loop oscillator; captive vortex spin-up is not necessarily a vortex precession mode; an external APG controlled by a pulsed actuator is not evidence of adverse gradient *inside* that actuator; patent claims are not measured proof; a tone alone does not identify edge tone, Kelvin-Helmholtz instability, Helmholtz resonance or vortex breakdown. Use time-resolved pressure/velocity/spectrogram and verified device-state baselines before naming a mode.

## Attached source pack verification
The user-provided `cfd_oscillators_refset.zip` was inventoried (22 entries). PDF first pages/abstracts were inspected for `tesar1_F.pdf`, `energies-12-03071.pdf`, `energies-12-03341-v2.pdf`, `epjconf_efm2017_02128.pdf`, `Fluidic_Generator_Of_Microbubbles_-_Oscillator_Wit.pdf`, `experimental-study-of-the-jet-driven-helmholtz-oscillator-54o29xtt79.pdf`, `US4041984.pdf` and `US4347983.pdf`. The last Bodai patent is an **unaccepted relevance lead** rather than claimed experimental corroboration. The repeated `energies-12-03341-v2 (1).pdf` is not a new source. Remaining attachments, such as injector drawings, have not been treated as tested oscillator designs. Original PDFs remain in the user attachment; this repository stores metadata, not the PDF copies.

## Decisive tests and next batch
1. Map wall/edge pressure and near-wall velocity, not merely inlet-minus-outlet pressure.
2. With flow forcing recorded, block a feedback passage, reverse one intersecting inlet, or change only a cavity load.
3. Change feedback travel length without changing the core geometry; compare frequency scaling against acoustic transit and convective delay hypotheses.
4. Record rising/falling pressure ramps to differentiate bistability from sustained switching.
5. For acoustic mechanisms, reconstruct matching baseline, room noise, microphone and downstream impedance before naming a frequency mechanism.
6. **CVD-P1A-01b:** source-screen up to six further independent, genuine 1858–1949 original works (especially early viscous vortex theories and actual wall-confined experiments), preserving prior editions/translations.
7. **CVD-APG-02:** new 20-candidate independent discovery batch covering early feedback patents, feedback-free devices, diffuser separation, pulsed-jet APG control and passive resonators, with patent priority-family trace.
8. **CVD-APG-03:** original full-text quantitative extraction for at most five studies, each with source-defined pressure locations, Reynolds/Strouhal, dimensions, geometry, threshold state and uncertainty.

No new measured pressure-gradient maps, original figure numerical extractions or patent claim-family full audits are asserted in this batch.
