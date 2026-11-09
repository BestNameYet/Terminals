# Linear one-inch mesh-count measurements

Method: start at a detected wire center, follow exactly one nominal inch perpendicular to that family, count complete center-to-center pitches, and interpolate the incomplete final pitch.
One inch on image = 116.3572 pixels. Assumes 12-inch nominal diameter of outer fitted rim.

Near-vertical family: mean **5.0850 openings/in** (4 measured one-inch windows; min 4.9966, max 5.2217).
Diagonal family: mean **5.2597 openings/in** (12 measured one-inch windows across four regions; min 5.2111, max 5.2949).

Rounded nominal classification: **approximately 5 × 5 mesh**.

| Wire family | Region | Starting wire | Complete pitches | Partial pitch | Mesh per inch |
|---|---|---:|---:|---:|---:|
| near_vertical | y=680 | 5 | 5 | 0.2217 | 5.2217 |
| near_vertical | y=680 | 10 | 5 | 0.1227 | 5.1227 |
| near_vertical | y=680 | 15 | 4 | 0.9966 | 4.9966 |
| near_vertical | y=680 | 20 | 4 | 0.9990 | 4.9990 |
| diagonal | A | 3 | 5 | 0.2518 | 5.2518 |
| diagonal | A | 5 | 5 | 0.2737 | 5.2737 |
| diagonal | A | 7 | 5 | 0.2901 | 5.2901 |
| diagonal | B | 3 | 5 | 0.2312 | 5.2312 |
| diagonal | B | 5 | 5 | 0.2567 | 5.2567 |
| diagonal | B | 7 | 5 | 0.2862 | 5.2862 |
| diagonal | C | 3 | 5 | 0.2111 | 5.2111 |
| diagonal | C | 5 | 5 | 0.2340 | 5.2340 |
| diagonal | C | 7 | 5 | 0.2675 | 5.2675 |
| diagonal | D | 3 | 5 | 0.2454 | 5.2454 |
| diagonal | D | 5 | 5 | 0.2733 | 5.2733 |
| diagonal | D | 7 | 5 | 0.2949 | 5.2949 |

### Notes
- nominal 12-inch outside diameter is an assumed physical calibration, not a measured physical standard
- wire peak positions are image-derived estimates; no lens/perspective correction
- different regions have different pitch
- one-inch segments count intervals between wire centers, not merely dark pixels or image-space crossings
- diagonal projection averages along the wire direction to suppress other-family crossings
