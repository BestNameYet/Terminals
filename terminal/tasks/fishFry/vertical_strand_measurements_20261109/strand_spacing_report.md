# Near-vertical wire spacing — cleaned upper-right pizza-screen quadrant

- Base image: pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724_arrow_removed_opencv_base.png
- Reference horizontal row: y = 680 px (top-origin)
- Detected strands: 29; adjacent center-to-center intervals: 28
- Mean adjacent spacing: 22.852 px; median 22.971 px; range 21.881–23.714 px
- Median apparent strand width: 3.47 px (FWHM of processed dark-line response)
- The width is an **image-space optical ridge width**, not a physical strand diameter. Processing blur, lighting, and wire crossings affect it.
- Strand 29 is edge-adjacent, supported by fewer sampling bands. The last row has no following adjacent strand.

| Strand | X center at y=680 (px) | Apparent FWHM (px) | Bands | Next strand | Center-to-center (px) |
|---:|---:|---:|---:|---:|---:|
| 1 | 3.023 | 3.31 | 6 | 2 | 22.051 |
| 2 | 25.074 | 3.43 | 6 | 3 | 21.881 |
| 3 | 46.955 | 3.42 | 6 | 4 | 22.007 |
| 4 | 68.961 | 3.32 | 6 | 5 | 22.032 |
| 5 | 90.993 | 3.33 | 6 | 6 | 22.011 |
| 6 | 113.005 | 3.34 | 6 | 7 | 22.296 |
| 7 | 135.301 | 3.31 | 6 | 8 | 22.200 |
| 8 | 157.500 | 3.32 | 6 | 9 | 22.522 |
| 9 | 180.022 | 3.25 | 6 | 10 | 22.341 |
| 10 | 202.364 | 3.26 | 6 | 11 | 22.487 |
| 11 | 224.851 | 3.20 | 6 | 12 | 22.666 |
| 12 | 247.517 | 3.32 | 6 | 13 | 22.743 |
| 13 | 270.259 | 3.40 | 6 | 14 | 22.675 |
| 14 | 292.934 | 3.69 | 6 | 15 | 22.968 |
| 15 | 315.902 | 3.63 | 6 | 16 | 22.974 |
| 16 | 338.876 | 4.05 | 6 | 17 | 23.291 |
| 17 | 362.166 | 4.03 | 6 | 18 | 23.232 |
| 18 | 385.399 | 4.53 | 6 | 19 | 23.227 |
| 19 | 408.626 | 4.65 | 6 | 20 | 23.714 |
| 20 | 432.339 | 5.11 | 5 | 21 | 23.202 |
| 21 | 455.541 | 5.06 | 5 | 22 | 23.202 |
| 22 | 478.744 | 4.96 | 5 | 23 | 23.289 |
| 23 | 502.032 | 4.53 | 5 | 24 | 23.226 |
| 24 | 525.258 | 4.73 | 5 | 25 | 23.461 |
| 25 | 548.720 | 4.68 | 4 | 26 | 23.426 |
| 26 | 572.146 | 4.80 | 4 | 27 | 23.631 |
| 27 | 595.777 | 4.71 | 3 | 28 | 23.470 |
| 28 | 619.247 | 3.47 | 3 | 29 | 23.618 |
| 29 | 642.866 | 3.36 | 1 | — | — |

## Measurement method
Averaged vertical image bands -> local 1D darkness residual (Gaussian sigma=0.65, baseline sigma=15) -> scipy peak prominence >=9 and distance>=16 -> quadratic subpixel peak interpolation -> matched strands across 6 bands -> linear center x(y) fit evaluated at y=680 -> adjacent differences

## Interpretation limits
near-vertical family only; x-measured horizontal separation at y=680; true perpendicular separation differs slightly for tilted wires; last edge-adjacent strand has fewer supporting bands; no physical mm conversion without scale; last strand has no following neighbor in detected region
