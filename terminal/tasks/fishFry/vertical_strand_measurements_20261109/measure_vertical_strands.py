#!/usr/bin/env python3
"""Measure apparent vertical mesh ridges and horizontal center spacing at y=680.

Image-space optical measurements only. No calibrated physical diameter.
"""
import csv
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks, peak_widths

SOURCE = Path("terminal/tasks/fishFry/pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724_arrow_removed_opencv_base.png")
DEST = Path("terminal/tasks/fishFry/vertical_strand_measurements_20261109")
EXPECTED_SOURCE_SHA256 = "7e07015264f782664407afe6ad3bc852b370651e4020b4bb524910f284dfb14e"
REFERENCE_Y = 680.0
BANDS = [
    (220,340,430),
    (320,460,550),
    (450,565,595),
    (540,640,625),
    (610,695,645),
    (645,713,650),
]
assert SOURCE.exists() and hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SOURCE_SHA256
assert not DEST.exists()
color = cv2.imread(str(SOURCE),cv2.IMREAD_COLOR)
gray = cv2.imread(str(SOURCE),cv2.IMREAD_GRAYSCALE)
assert color is not None and color.shape == (724,724,3)
assert gray is not None and gray.shape == (724,724)
gray = gray.astype(np.float64)

def subpixel_peak(profile,p):
    assert 1 <= p < len(profile)-1
    y0,y1,y2=[float(profile[i]) for i in (p-1,p,p+1)]
    denom=y0-2*y1+y2
    shift = 0.5*(y0-y2)/denom if abs(denom)>1e-9 else 0.0
    return float(p+np.clip(shift,-0.5,0.5))

profiles = []
for first,last,xmax in BANDS:
    # Average the grayscale over a strip to cancel diagonal crossing-wire features.
    darkness = 255.0 - gray[first:last,:xmax].mean(axis=0)
    smoothed = gaussian_filter1d(darkness,sigma=0.65)
    corrected = smoothed - gaussian_filter1d(smoothed,sigma=15.0)
    peaks,props = find_peaks(corrected,prominence=9.0,distance=16,width=(0.5,9.0))
    fwhm = peak_widths(corrected,peaks,rel_height=0.5)[0]
    observations = []
    for k,p in enumerate(peaks):
        # Do not use peaks that are truncated at the image ROI boundary.
        if p <= 1 or p >= xmax-5:
            continue
        observations.append({
            "x":subpixel_peak(corrected,int(p)),
            "fwhm":float(fwhm[k]),
            "prominence":float(props["prominences"][k]),
        })
    profiles.append({"y":(first+last-1)/2.0,"y_range":[first,last],"xmax":xmax,"observations":observations})
reference = profiles[-1]["observations"]
assert len(reference)==29,("unexpected candidate strand count",len(reference),[v["x"] for v in reference])
xs_ref = np.array([v["x"] for v in reference])
assert np.all((np.diff(xs_ref)>19)&(np.diff(xs_ref)<26)),("bad reference gaps",xs_ref.tolist())
rows=[]
for i,ref in enumerate(reference):
    observations=[]
    for profile in profiles:
        hits = [v for v in profile["observations"] if abs(v["x"]-ref["x"])<6]
        if not hits: continue
        closest=min(hits,key=lambda v:abs(v["x"]-ref["x"]))
        observations.append({"y":profile["y"],"x":closest["x"],"fwhm":closest["fwhm"],
                             "prominence":closest["prominence"],"xmax":profile["xmax"]})
    assert observations,("no observations",i)
    xx=np.array([v["x"] for v in observations],dtype=np.float64)
    yy=np.array([v["y"] for v in observations],dtype=np.float64)
    if len(observations)>=2:
        slope,intercept=np.polyfit(yy,xx,1)
        pred=slope*REFERENCE_Y+intercept
        rms=float(np.sqrt(np.mean((xx-(slope*yy+intercept))**2)))
    else:
        slope=0.0
        pred=ref["x"]
        rms=None
    # Optical ridge width: FWHM of baseline-subtracted, Gaussian-filtered
    # darkness, across valid bands. Discard near-border / unusually broad
    # edge artifacts and preserve all raw observations in the JSON.
    widths=[v["fwhm"] for v in observations
            if v["x"] <= v["xmax"]-9 and 2.0 <= v["fwhm"] <= 8.0]
    if not widths:
        widths=[ref["fwhm"]]
    rows.append({
        "index":i+1,
        "center_x":float(pred),
        "width_fwhm":float(np.median(widths)),
        "band_count":len(observations),
        "fit_rms":rms,
        "slope_dx_dy":float(slope),
        "observations":observations,
    })
xs=np.array([r["center_x"] for r in rows])
spacings=np.diff(xs)
assert len(rows)==29 and len(spacings)==28
assert np.all((spacings>18.0)&(spacings<27.0)),spacings.tolist()
fit_rms=np.array([r["fit_rms"] for r in rows if r["fit_rms"] is not None])
assert np.median(fit_rms)<1.4,fit_rms.tolist()
assert np.all(np.diff(xs)>0)
assert np.max(np.abs(xs-xs_ref))<2.5,("model vs reference mismatch",xs.tolist(),xs_ref.tolist())
DEST.mkdir(parents=True,exist_ok=False)

fieldnames=["strand","center_x_at_y680_px","apparent_width_fwhm_px","number_of_bands",
            "fit_rms_px","next_strand","center_to_center_dx_px"]
with (DEST/"strand_spacing.csv").open("w",newline="",encoding="utf-8") as fp:
    out=csv.DictWriter(fp,fieldnames=fieldnames)
    out.writeheader()
    for i,r in enumerate(rows):
        out.writerow({
            "strand":r["index"],
            "center_x_at_y680_px":f"{r['center_x']:.3f}",
            "apparent_width_fwhm_px":f"{r['width_fwhm']:.2f}",
            "number_of_bands":r["band_count"],
            "fit_rms_px":"" if r["fit_rms"] is None else f"{r['fit_rms']:.2f}",
            "next_strand":i+2 if i+1<len(rows) else "",
            "center_to_center_dx_px":f"{spacings[i]:.3f}" if i<len(spacings) else "",
        })

mean=float(spacings.mean())
median=float(np.median(spacings))
med_width=float(np.median([r["width_fwhm"] for r in rows]))
stats = {
  "source":str(SOURCE),
  "source_sha256":EXPECTED_SOURCE_SHA256,
  "image_dimensions":[724,724],
  "family":"near-vertical wires only",
  "reference_y_px":REFERENCE_Y,
  "band_ranges_y":[p["y_range"] for p in profiles],
  "strand_count":len(rows),
  "adjacent_interval_count":len(spacings),
  "spacing_mean_px":mean,
  "spacing_median_px":median,
  "spacing_min_px":float(spacings.min()),
  "spacing_max_px":float(spacings.max()),
  "apparent_width_median_fwhm_px":med_width,
  "apparent_width_min_fwhm_px":min(r["width_fwhm"] for r in rows),
  "apparent_width_max_fwhm_px":max(r["width_fwhm"] for r in rows),
  "fit_rms_median_px":float(np.median(fit_rms)),
  "method":"Averaged vertical image bands -> local 1D darkness residual (Gaussian sigma=0.65, baseline sigma=15) -> scipy peak prominence >=9 and distance>=16 -> quadratic subpixel peak interpolation -> matched strands across 6 bands -> linear center x(y) fit evaluated at y=680 -> adjacent differences",
  "width_method":"Photometric dark-ridge full-width at half-prominence, after sigma=0.65 pixel smoothing; not a calibrated physical wire diameter, contains optical blur, lighting, crossing-wire/rim effects",
  "limitations":["near-vertical family only","x-measured horizontal separation at y=680; true perpendicular separation differs slightly for tilted wires","last edge-adjacent strand has fewer supporting bands","no physical mm conversion without scale","last strand has no following neighbor in detected region"],
  "rows":rows,
}
(DEST/"measurement_data.json").write_text(json.dumps(stats,indent=2)+"\n",encoding="utf-8")

table_lines = [
"# Near-vertical wire spacing — cleaned upper-right pizza-screen quadrant",
"",
f"- Base image: {SOURCE.name}",
f"- Reference horizontal row: y = {REFERENCE_Y:g} px (top-origin)",
f"- Detected strands: {len(rows)}; adjacent center-to-center intervals: {len(spacings)}",
f"- Mean adjacent spacing: {mean:.3f} px; median {median:.3f} px; range {spacings.min():.3f}–{spacings.max():.3f} px",
f"- Median apparent strand width: {med_width:.2f} px (FWHM of processed dark-line response)",
"- The width is an **image-space optical ridge width**, not a physical strand diameter. Processing blur, lighting, and wire crossings affect it.",
"- Strand 29 is edge-adjacent, supported by fewer sampling bands. The last row has no following adjacent strand.",
"",
"| Strand | X center at y=680 (px) | Apparent FWHM (px) | Bands | Next strand | Center-to-center (px) |",
"|---:|---:|---:|---:|---:|---:|",
]
for i,r in enumerate(rows):
    next_strand=str(i+2) if i<len(spacings) else "—"
    distance=f"{spacings[i]:.3f}" if i<len(spacings) else "—"
    table_lines.append(f"| {i+1} | {r['center_x']:.3f} | {r['width_fwhm']:.2f} | {r['band_count']} | {next_strand} | {distance} |")
table_lines += ["","## Measurement method",stats["method"],"",
                "## Interpretation limits","; ".join(stats["limitations"])]
(DEST/"strand_spacing_report.md").write_text("\n".join(table_lines)+"\n",encoding="utf-8")

overlay=color.copy()
# Only mark the interior bottom portion at the measurement height.
cv2.line(overlay,(0,680),(723,680),(180,155,50),1)
for r in rows:
    x=int(round(r["center_x"]))
    cv2.line(overlay,(x,625),(x,702),(0,0,235),1)
    cv2.circle(overlay,(x,680),2,(0,220,255),-1)
    tx=max(0,x-(8 if r["index"]>=10 else 4))
    cv2.putText(overlay,str(r["index"]),(tx,718),cv2.FONT_HERSHEY_SIMPLEX,0.34,
                (0,0,190),1,cv2.LINE_AA)
assert cv2.imwrite(str(DEST/"numbered_vertical_strands.png"),overlay)
assert cv2.imread(str(DEST/"numbered_vertical_strands.png")).shape==(724,724,3)

# Render complete interval graph using deterministic OpenCV raster operations.
canvas=np.full((490,1100,3),255,dtype=np.uint8)
left,right,top,bottom=72,1060,60,410
cv2.putText(canvas,"Near-vertical strand center spacing at y=680 px",(62,35),
            cv2.FONT_HERSHEY_SIMPLEX,0.85,(20,20,20),2,cv2.LINE_AA)
vmin,vmax=20.0,25.0
to_y=lambda v:int(round(bottom-(v-vmin)/(vmax-vmin)*(bottom-top)))
to_x=lambda i:int(round(left+(i-1)/(len(spacings)-1)*(right-left)))
for yval in (20,21,22,23,24,25):
    y=to_y(yval)
    cv2.line(canvas,(left,y),(right,y),(225,225,225),1)
    cv2.putText(canvas,str(yval),(30,y+5),cv2.FONT_HERSHEY_SIMPLEX,0.52,(40,40,40),1,cv2.LINE_AA)
cv2.line(canvas,(left,top),(left,bottom),(40,40,40),2)
cv2.line(canvas,(left,bottom),(right,bottom),(40,40,40),2)
pts=np.array([[to_x(i+1),to_y(v)] for i,v in enumerate(spacings)],dtype=np.int32)
cv2.polylines(canvas,[pts],False,(170,75,0),2,cv2.LINE_AA)
for j,(px,py) in enumerate(pts):
    cv2.circle(canvas,(int(px),int(py)),3,(20,70,180),-1)
    if (j+1)%2 == 1:
        cv2.putText(canvas,str(j+1),(int(px)-8,bottom+22),cv2.FONT_HERSHEY_SIMPLEX,0.43,(35,35,35),1,cv2.LINE_AA)
cv2.putText(canvas,"Adjacent pair starting with strand index",(370,475),cv2.FONT_HERSHEY_SIMPLEX,0.6,(30,30,30),1,cv2.LINE_AA)
assert cv2.imwrite(str(DEST/"spacing_plot.png"),canvas)
assert cv2.imread(str(DEST/"spacing_plot.png")).shape==canvas.shape

assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED_SOURCE_SHA256
assert len(list(DEST.iterdir()))==5,sorted(str(p) for p in DEST.iterdir())
with (DEST/"strand_spacing.csv").open(newline="",encoding="utf8") as fp:
    saved=list(csv.DictReader(fp))
assert len(saved)==29
assert all(abs(float(saved[i]["center_to_center_dx_px"])-(xs[i+1]-xs[i]))<0.001 for i in range(28))
print("SOURCE",SOURCE)
print("OPENCV_VERSION",cv2.__version__)
print("STRANDS",len(rows),"PAIRS",len(spacings),"REFERENCE_Y",REFERENCE_Y)
print("SPACING_MEAN",round(mean,3),"MEDIAN",round(median,3),
      "MIN",round(float(spacings.min()),3),"MAX",round(float(spacings.max()),3))
print("WIDTH_FWHM_MEDIAN",round(med_width,3),"RANGE",round(min(r["width_fwhm"] for r in rows),3),round(max(r["width_fwhm"] for r in rows),3))
print("BAND_FIT_RMS_MEDIAN",round(float(np.median(fit_rms)),3))
for i,r in enumerate(rows):
    print("TABLE",f"{r['index']:02d}",f"{r['center_x']:.3f}",
          f"{r['width_fwhm']:.2f}",str(r["band_count"]),
          f"{spacings[i]:.3f}" if i<len(spacings) else "NA")
for p in sorted(DEST.iterdir()):
    print("FILE",p,p.stat().st_size,hashlib.sha256(p.read_bytes()).hexdigest())
print("VALIDATED","all table rows, original source, 5 output files, pixel dimensions and fitted spacing")

