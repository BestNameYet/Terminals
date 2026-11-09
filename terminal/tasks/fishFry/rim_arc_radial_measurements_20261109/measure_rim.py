#!/usr/bin/env python3
"""Measure upper-right pizza screen outer rim, radii from original image center, and equal fitted-circle arc intervals."""
import csv, json, math, hashlib
from pathlib import Path
import cv2
import numpy as np
from scipy.ndimage import map_coordinates, gaussian_filter1d
from scipy.optimize import least_squares

ROOT=Path("terminal/tasks/fishFry")
SOURCE=ROOT/"pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724_arrow_removed_opencv_base.png"
SOBEL=ROOT/"pizza_screen_upper_right_724x724_arrow_removed_sobel_x.png"
OUT=ROOT/"rim_arc_radial_measurements_20261109"
SOURCE_SHA="7e07015264f782664407afe6ad3bc852b370651e4020b4bb524910f284dfb14e"
SOBEL_SHA="50a9d08fc4d88831b06523aced7b75e69d845cf1db0e276aeb20f3fbabbbf944"
ORIGIN=np.array([0.0,724.0])
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA
assert hashlib.sha256(SOBEL.read_bytes()).hexdigest()==SOBEL_SHA
assert not OUT.exists()
bgr=cv2.imread(str(SOURCE),cv2.IMREAD_COLOR)
sobel=cv2.imread(str(SOBEL),cv2.IMREAD_GRAYSCALE)
assert bgr is not None and bgr.shape==(724,724,3)
assert sobel is not None and sobel.shape==(724,724)
gray=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY).astype(float)

def radial_edge(theta_deg,expected_radius=None):
    """Find radial gray->white transition at visible outer edge, with quadratic subpixel refinement."""
    t=math.radians(theta_deg)
    lo=695.0 if expected_radius is None else max(689.0,expected_radius-9.)
    hi=722.0 if expected_radius is None else min(729.0,expected_radius+9.)
    rs=np.arange(lo,hi+0.0001,0.5)
    xs=ORIGIN[0]+rs*math.cos(t)
    ys=ORIGIN[1]-rs*math.sin(t)
    valid=(xs>=0)&(xs<=723)&(ys>=0)&(ys<=723)
    rs,xs,ys=rs[valid],xs[valid],ys[valid]
    assert len(rs)>=24,(theta_deg,lo,hi,len(rs))
    intensity=map_coordinates(gray,[ys,xs],order=1,mode="nearest")
    smooth=gaussian_filter1d(intensity,sigma=2.0)
    deriv=np.gradient(smooth,0.5)
    k=int(np.argmax(deriv))
    assert 2<=k<len(rs)-2,(theta_deg,k,len(rs))
    assert float(deriv[k])>7.0,(theta_deg,float(deriv[k]))
    f0,f1,f2=map(float,deriv[k-1:k+2])
    denom=f0-2*f1+f2
    shift=.5*(f0-f2)/denom if abs(denom)>1e-8 else 0.0
    shift=float(np.clip(shift,-.5,.5))
    radius=float(rs[k]+.5*shift)
    xy=(ORIGIN+radius*np.array([math.cos(t),-math.sin(t)])).tolist()
    return {"ray_angle_deg":float(theta_deg),"radius_from_origin_px":radius,
            "x_px":float(xy[0]),"y_px":float(xy[1]),
            "outward_edge_gradient":float(deriv[k]),
            "radius_search":[float(rs[0]),float(rs[-1])]}

# A dense set of independent measurements fits the circle. Restrict to the visible, clean arc
# so the arrow-inpaint region (lower-right outside of metal rim) cannot bias the fit.
fit_angles=np.arange(10.0,80.01,2.5)
control=[radial_edge(float(angle)) for angle in fit_angles]
xy=np.array([[q["x_px"],q["y_px"]] for q in control])
def residual(params):
    cx,cy,radius=params
    return np.linalg.norm(xy-np.array([cx,cy]),axis=1)-radius

fit=least_squares(residual,x0=[0.,724.,708.],loss="soft_l1",f_scale=1.5,
                  bounds=([-70.,654.,655.],[70.,794.,755.]))
cx,cy,R=map(float,fit.x)
errors=residual(fit.x)
rms=float(np.sqrt(np.mean(errors**2)))
assert fit.success and 680<R<735,(fit.message,fit.x.tolist())
assert abs(cx)<50 and abs(cy-724)<50,(cx,cy)
assert rms<4.5,("excessive circle residual",rms,fit.x.tolist(),errors.tolist())

def circle_angle(p):
    return math.atan2(cy-p["y_px"],p["x_px"]-cx)
start=circle_angle(control[0])
end=circle_angle(control[-1])
assert end>start and math.radians(60)<end-start<math.radians(80)
N=5
sample_angles=np.linspace(start,end,N)
interval_px=R*(end-start)/(N-1)
px_per_in=R/6.0
interval_inches=interval_px/px_per_in
# Preserve actual measured distances from ORIGINAL QUADRANT ORIGIN, not from fitted circle center.
out=[]
for i,angle in enumerate(sample_angles):
    intended=np.array([cx+R*math.cos(angle),cy-R*math.sin(angle)])
    vector=intended-ORIGIN
    expected_radius=float(np.linalg.norm(vector))
    origin_angle_deg=float(math.degrees(math.atan2(-vector[1],vector[0])))
    observed=radial_edge(origin_angle_deg,expected_radius)
    circle_offset=math.hypot(observed["x_px"]-cx,observed["y_px"]-cy)-R
    out.append({
        "index":i+1,"equal_arc_angle_about_fit_deg":math.degrees(angle),
        "ray_angle_from_origin_deg":observed["ray_angle_deg"],
        "outer_edge_x_px":observed["x_px"],
        "outer_edge_y_px":observed["y_px"],
        "radius_from_origin_px":observed["radius_from_origin_px"],
        "radius_from_origin_inches_est":observed["radius_from_origin_px"]/px_per_in,
        "arc_distance_from_first_px":i*interval_px,
        "arc_distance_from_first_inches_est":i*interval_inches,
        "circle_edge_residual_px":circle_offset,
        "edge_gradient":observed["outward_edge_gradient"]
    })
assert len(out)==5
assert all(675<m["radius_from_origin_px"]<745 for m in out)
assert all(abs(m["circle_edge_residual_px"])<7 for m in out)
assert math.isclose(out[-1]["arc_distance_from_first_px"],R*(end-start),rel_tol=1e-12)
assert np.std(np.diff([m["arc_distance_from_first_px"] for m in out]))<1e-10

OUT.mkdir(parents=True)
columns=["index","equal_arc_angle_about_fit_deg","ray_angle_from_origin_deg",
         "outer_edge_x_px","outer_edge_y_px","radius_from_origin_px",
         "radius_from_origin_inches_est","arc_distance_from_first_px",
         "arc_distance_from_first_inches_est","circle_edge_residual_px",
         "edge_gradient"]
with (OUT/"rim_measurements.csv").open("w",newline="",encoding="utf-8") as fp:
    writer=csv.DictWriter(fp,fieldnames=columns)
    writer.writeheader()
    for d in out:
        writer.writerow({k:(v if k=="index" else f"{v:.4f}") for k,v in d.items()})
doc={
    "origin_quadrant_xy_px":ORIGIN.tolist(),
    "origin_original_full_image_xy_px":[724.0,724.0],
    "coordinates":"x increases right; y increases down; origin at bottom-left corner of cropped upper-right quadrant",
    "nominal_physical_screen_diameter_inches":12.0,
    "nominal_physical_radius_inches":6.0,
    "source_image":str(SOURCE),
    "sobel_image":str(SOBEL),
    "edge_definition":"radial maximum positive gradient at outermost rim-to-white transition in cleaned grayscale image, cross-visualized against saved Sobel-X image",
    "circle_fit":{"center_x_px":cx,"center_y_px":cy,"radius_px":R,"rms_radial_residual_px":rms,
                  "n_control_points":len(control),"control_ray_angles_deg":[10.,80.,2.5]},
    "scale":{"pixels_per_inch_estimate":px_per_in,"inches_per_pixel_estimate":1/px_per_in,
             "calibration_limitation":"Assumes nominal 12-inch screen outer rim is circular and equals measured edge; not an independent physical calibration"},
    "equal_arc_sampling":{"number_points":N,"number_equal_intervals":N-1,
                          "arc_first_to_last_px":float(R*(end-start)),
                          "arc_first_to_last_inches_est":float(6*(end-start)),
                          "interval_px":interval_px,"interval_inches_est":interval_inches,
                          "fit_center_angle_start_deg":math.degrees(start),
                          "fit_center_angle_end_deg":math.degrees(end)},
    "measurements":out,
    "control_measurements":control,
}
(OUT/"rim_measurements.json").write_text(json.dumps(doc,indent=2)+"\n",encoding="utf8")
markdown=[
 "# Upper-right pizza screen outer rim: radial lengths and equal arc increments","",
 f"Reference origin in 724×724 image: **(x=0, y=724)**. Nominal diameter: **12 inches**.",
 f"Fitted circle: center ({cx:.3f}, {cy:.3f}) px, radius {R:.3f} px, radial residual RMS {rms:.3f} px.",
 f"Scale estimate: {px_per_in:.3f} px/in. **Assumes nominal outer diameter is exactly 12 inches and image has negligible perspective distortion.**",
 f"Five measured outer-rim points and four equal fitted-circle arc intervals of {interval_px:.3f} pixels = {interval_inches:.4f} inches each.",
 "Radii are measured from the specified **quadrant origin**, not from the fitted circle center.",
 "Equal arc spacing is imposed on the fitted circle; observed edges are detected independently along each origin ray.",
 "",
 "| Point | x (px) | y (px) | Origin angle (°) | Radius from origin (px) | Radius (in est.) | Arc from first (px) | Arc from first (in est.) |",
 "|---:|---:|---:|---:|---:|---:|---:|---:|"
]
for q in out:
    markdown.append(f"| {q['index']} | {q['outer_edge_x_px']:.2f} | {q['outer_edge_y_px']:.2f} | {q['ray_angle_from_origin_deg']:.2f} | {q['radius_from_origin_px']:.3f} | {q['radius_from_origin_inches_est']:.4f} | {q['arc_distance_from_first_px']:.3f} | {q['arc_distance_from_first_inches_est']:.4f} |")
markdown.extend(["", "## Limitations",
  "- The Sobel-X image emphasizes horizontal gradients and is weak on near-horizontal rim sections. Therefore the outer edge was localized using the corresponding clean grayscale base image and verified visually against Sobel-X.",
  "- Equal arc distances are those of the **fitted circle**, rather than sums of chord lengths between noisy observed edge pixels.",
  "- Radial distances from the original-image center differ from fitted-circle radius if the screen center is not precisely at the image center.",
  "- A nominal diameter alone is insufficient to guarantee physical-inch accuracy if the captured image has perspective or lens distortion.",
  "",
  "## Edge localization",
  "Sample radial intensities every 0.5 pixels; smooth with 1-pixel Gaussian; locate maximum outward lightening gradient, refine by a 3-sample parabolic fit; robustly fit a circle to 29 control points between nominal angles 10° and 80°.",
  "",
])
(OUT/"rim_measurements_report.md").write_text("\n".join(markdown),encoding="utf8")

def annotate(background):
    im=background.copy()
    if im.ndim==2:
        im=cv2.cvtColor(im,cv2.COLOR_GRAY2BGR)
    origin=(0,723)
    cv2.circle(im,origin,5,(10,10,230),-1)
    for k,q in enumerate(out):
        dest=(int(round(q["outer_edge_x_px"])),int(round(q["outer_edge_y_px"])))
        cv2.line(im,origin,dest,(20,130,255),1,cv2.LINE_AA)
        cv2.circle(im,dest,5,(20,245,20),-1,cv2.LINE_AA)
        x=min(693,max(8,dest[0]-8))
        y=min(704,max(18,dest[1]-12))
        cv2.putText(im,str(k+1),(x,y),cv2.FONT_HERSHEY_SIMPLEX,0.5,(10,5,210),1,cv2.LINE_AA)
    # Fitted outer rim arc rendered as consecutive 0.5-degree circle points.
    tlist=np.linspace(start,end,190)
    pts=np.array([(int(round(cx+R*math.cos(t))),int(round(cy-R*math.sin(t)))) for t in tlist],np.int32)
    cv2.polylines(im,[pts],False,(25,210,30),1,cv2.LINE_AA)
    return im

overlay=annotate(bgr)
sobel_overlay=annotate(sobel)
assert cv2.imwrite(str(OUT/"rim_radii_annotated.png"),overlay)
assert cv2.imwrite(str(OUT/"rim_radii_sobel_annotated.png"),sobel_overlay)
assert cv2.imread(str(OUT/"rim_radii_annotated.png")).shape==(724,724,3)
assert cv2.imread(str(OUT/"rim_radii_sobel_annotated.png")).shape==(724,724,3)
with (OUT/"rim_measurements.csv").open(newline="",encoding="utf8") as f:
    assert len(list(csv.DictReader(f)))==N
assert len(list(OUT.iterdir()))==5
print("SOURCE",SOURCE,"SOBEL",SOBEL,flush=True)
print("FIT_CIRCLE",f"center=({cx:.3f},{cy:.3f})",f"radius={R:.3f}",f"residual_rms={rms:.3f}",f"control_points={len(control)}",flush=True)
print("NOMINAL_SCALE",f"px_per_in={px_per_in:.4f}",flush=True)
print("EQUAL_ARC",f"interval_px={interval_px:.4f}",f"interval_inches={interval_inches:.5f}",f"total_px={interval_px*8:.4f}",flush=True)
for q in out:
    print("RIM_POINT",q["index"],
          f"x={q['outer_edge_x_px']:.3f}",
          f"y={q['outer_edge_y_px']:.3f}",
          f"radius_px={q['radius_from_origin_px']:.3f}",
          f"origin_ray_angle={q['ray_angle_from_origin_deg']:.3f}",
          f"arc_from_first_px={q['arc_distance_from_first_px']:.3f}",
          f"circle_residual_px={q['circle_edge_residual_px']:.3f}",flush=True)
for path in sorted(OUT.iterdir()):
    print("OUTPUT",path,"bytes",path.stat().st_size,"sha256",hashlib.sha256(path.read_bytes()).hexdigest(),flush=True)
print("VALIDATED","source unchanged, 9 radial measurements, 8 equal arc intervals, source and Sobel overlays, saved tables",flush=True)

