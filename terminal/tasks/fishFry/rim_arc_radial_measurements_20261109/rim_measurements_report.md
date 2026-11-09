# Upper-right pizza screen outer rim: radial lengths and equal arc increments

Reference origin in 724×724 image: **(x=0, y=724)**. Nominal diameter: **12 inches**.
Fitted circle: center (15.549, 723.863) px, radius 698.143 px, radial residual RMS 1.779 px.
Scale estimate: 116.357 px/in. **Assumes nominal outer diameter is exactly 12 inches and image has negligible perspective distortion.**
Five measured outer-rim points and four equal fitted-circle arc intervals of 216.405 pixels = 1.8598 inches each.
Radii are measured from the specified **quadrant origin**, not from the fitted circle center.
Equal arc spacing is imposed on the fitted circle; observed edges are detected independently along each origin ray.

| Point | x (px) | y (px) | Origin angle (°) | Radius from origin (px) | Radius (in est.) | Arc from first (px) | Arc from first (in est.) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 702.92 | 600.06 | 10.00 | 713.759 | 6.1342 | 0.000 | 0.0000 |
| 2 | 631.53 | 396.74 | 27.39 | 711.292 | 6.1130 | 216.405 | 1.8598 |
| 3 | 503.92 | 222.91 | 44.84 | 710.654 | 6.1075 | 432.810 | 3.7197 |
| 4 | 326.53 | 100.31 | 62.37 | 703.995 | 6.0503 | 649.215 | 5.5795 |
| 5 | 122.12 | 31.69 | 80.00 | 703.003 | 6.0418 | 865.620 | 7.4393 |

## Limitations
- The Sobel-X image emphasizes horizontal gradients and is weak on near-horizontal rim sections. Therefore the outer edge was localized using the corresponding clean grayscale base image and verified visually against Sobel-X.
- Equal arc distances are those of the **fitted circle**, rather than sums of chord lengths between noisy observed edge pixels.
- Radial distances from the original-image center differ from fitted-circle radius if the screen center is not precisely at the image center.
- A nominal diameter alone is insufficient to guarantee physical-inch accuracy if the captured image has perspective or lens distortion.

## Edge localization
Sample radial intensities every 0.5 pixels; smooth with 1-pixel Gaussian; locate maximum outward lightening gradient, refine by a 3-sample parabolic fit; robustly fit a circle to 29 control points between nominal angles 10° and 80°.
