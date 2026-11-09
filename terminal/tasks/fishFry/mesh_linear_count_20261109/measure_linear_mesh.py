#!/usr/bin/env python3
"""Count mesh openings across exact one-inch line segments perpendicular to each wire family.

All dimensions in image pixels. Physical inch scale assumes nominal 12-inch outer rim.
"""
from pathlib import Path
import csv, json, math, hashlib
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks

root=Path("terminal/tasks/fishFry")
source=root/"pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724_arrow_removed_opencv_base.png"
v_file=root/"vertical_strand_measurements_20261109"/"strand_spacing.csv"
out=root/"mesh_linear_count_20261109"
assert not out.exists(),f"Refusing to overwrite {out}"
assert hashlib.sha256(source.read_bytes()).hexdigest()=="7e07015264f782664407afe6ad3bc852b370651e4020b4bb524910f284dfb14e"
im=cv2.imread(str(source),cv2.IMREAD_GRAYSCALE)
assert im is not None and im.shape==(724,724)
color=cv2.cvtColor(im,cv2.COLOR_GRAY2BGR)
inch_px=698.143/6.0
assert 116.3<inch_px<116.4

def one_inch(centers,index,family,extra):
    centers=np.asarray(centers,dtype=float)
    assert np.all(np.diff(centers)>15)
    start=float(centers[index])
    end=start+inch_px
    k=int(np.searchsorted(centers,end,side="right")-1)
    assert k+1<len(centers) and k>=index, (family,index,end,centers.tolist())
    complete=k-index
    pitch=float(centers[k+1]-centers[k])
    fractional=(end-float(centers[k]))/pitch
    assert 0<=fractional<1
    result={
      "family":family,"start_wire_index_one_based":index+1,
      "start_coordinate_along_wire_normal_px":start,
      "one_inch_endpoint_coordinate_px":end,
      "complete_center_to_center_pitches":complete,
      "fractional_final_pitch":float(fractional),
      "linear_mesh_count_per_inch":float(complete+fractional),
      "final_bracketing_wire_centers_px":[float(centers[k]),float(centers[k+1])],
    }
    result.update(extra)
    return result

with v_file.open(newline="",encoding="utf-8") as fp: vw=list(csv.DictReader(fp))
assert len(vw)==29
vcenters=np.array([float(p["center_x_at_y680_px"]) for p in vw])
samples=[]
for index in (4,9,14,19):
    samples.append(one_inch(vcenters,index,"near_vertical",{
        "position":"horizontal at y=680 px, from fitted near-vertical wire center",
        "line_direction_angle_deg":0.0,
        "source_band":"six fitted vertical measurement bands",
        "row_y_px":680.0,
    }))
regions=[
   ("A",(65,220,420,540),142.1),
   ("B",(65,350,400,660),142.2),
   ("C",(170,330,465,610),142.3),
   ("D",(40,200,380,650),142.0),
]
diagonal_centers={}
for name,(x0,y0,x1,y1),theta in regions:
    image=im[y0:y1,x0:x1].astype(float)
    yy,xx=np.indices(image.shape,dtype=float)
    xx+=x0;yy+=y0
    angle=math.radians(theta)
    normal=np.array([-math.sin(angle),math.cos(angle)])
    n_coord=normal[0]*xx+normal[1]*yy
    bucket=np.floor(n_coord).astype(int)
    base=int(bucket.min());bucket-=base
    length=int(bucket.max()+1)
    counts=np.bincount(bucket.ravel(),minlength=length)
    intensity=np.bincount(bucket.ravel(),weights=(255-image).ravel(),minlength=length)/np.maximum(counts,1)
    smooth=gaussian_filter1d(intensity,.6)
    residual=smooth-gaussian_filter1d(smooth,13)
    eligible=counts>=120
    peaks,_=find_peaks(np.where(eligible,residual,-1000),prominence=5,distance=16)
    peaks=peaks[(peaks>8)&(peaks<len(residual)-8)]
    centers=[]
    for p in peaks:
        f0,f1,f2=[float(residual[q]) for q in (p-1,p,p+1)]
        den=f0-2*f1+f2
        delta=.5*(f0-f2)/den if abs(den)>1e-9 else 0.0
        delta=float(np.clip(delta,-.5,.5))
        # Bin-center +0.5 adjustment cancels when computing differences.
        centers.append(float(base+p+delta+.5))
    assert len(centers)>=13,(name,len(centers))
    assert np.all((np.diff(centers)>18)&(np.diff(centers)<26)),(name,centers)
    diagonal_centers[name]={"centers":centers,"angle":theta,"normal":normal.tolist(),"region_xyxy":[x0,y0,x1,y1]}
    for index in (2,4,6):
        samples.append(one_inch(centers,index,"diagonal",{
            "position":"line normal to diagonal wires; centers detected by averaging along wire direction",
            "region":name,"region_xyxy":[x0,y0,x1,y1],
            "line_direction_angle_deg":(theta-90.0)%180.0,
            "wire_angle_deg":theta,
        }))
assert len(samples)==16

v_count=np.array([d["linear_mesh_count_per_inch"] for d in samples if d["family"]=="near_vertical"])
d_count=np.array([d["linear_mesh_count_per_inch"] for d in samples if d["family"]=="diagonal"])
assert len(v_count)==4 and len(d_count)==12
assert 4.5<v_count.min() and v_count.max()<5.6
assert 4.5<d_count.min() and d_count.max()<5.6
results={
 "definition":"wire-center anchored, one-inch line perpendicular to the measured wire family; count complete center-to-center pitches + fraction of final incomplete pitch",
 "source_image":str(source),
 "source_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
 "scale_origin":"12-in nominal diameter / fitted 698.143-pixel outer rim radius",
 "one_inch_px":inch_px,
 "vertical_ones":[float(x) for x in v_count],
 "diagonal_ones":[float(x) for x in d_count],
 "summary":{
   "vertical":{"mean":float(v_count.mean()),"min":float(v_count.min()),"max":float(v_count.max()),"n_samples":len(v_count)},
   "diagonal":{"mean":float(d_count.mean()),"min":float(d_count.min()),"max":float(d_count.max()),"n_samples":len(d_count)}
 },
 "nominal_classification":"approximately 5 x 5 mesh (measured fractional counts need not be exact integers)",
 "limitations":["nominal 12-inch outside diameter is an assumed physical calibration, not a measured physical standard","wire peak positions are image-derived estimates; no lens/perspective correction","different regions have different pitch","one-inch segments count intervals between wire centers, not merely dark pixels or image-space crossings","diagonal projection averages along the wire direction to suppress other-family crossings"],
 "samples":samples,
 "diagonal_detected_wire_coordinates":diagonal_centers
}
out.mkdir()
(out/"mesh_linear_one_inch_measurements.json").write_text(json.dumps(results,indent=2)+"\n",encoding="utf-8")
rows=[{
    "wire_family":d["family"],
    "region":d.get("region","lower-quadrant fitted vertical"),
    "start_wire_index":d["start_wire_index_one_based"],
    "start_normal_coordinate_px":f"{d['start_coordinate_along_wire_normal_px']:.3f}",
    "end_normal_coordinate_px":f"{d['one_inch_endpoint_coordinate_px']:.3f}",
    "complete_pitches":d["complete_center_to_center_pitches"],
    "fractional_pitch":f"{d['fractional_final_pitch']:.4f}",
    "mesh_count_per_inch":f"{d['linear_mesh_count_per_inch']:.4f}"
} for d in samples]
with (out/"mesh_linear_one_inch_measurements.csv").open("w",newline="",encoding="utf-8") as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]))
    writer.writeheader();writer.writerows(rows)
with (out/"mesh_linear_one_inch_measurements.csv").open("r",encoding="utf-8",newline="") as f:
    assert len(list(csv.DictReader(f)))==16

report=[
"# Linear one-inch mesh-count measurements",
"",
"Method: start at a detected wire center, follow exactly one nominal inch perpendicular to that family, count complete center-to-center pitches, and interpolate the incomplete final pitch.",
f"One inch on image = {inch_px:.4f} pixels. Assumes 12-inch nominal diameter of outer fitted rim.",
"",
f"Near-vertical family: mean **{v_count.mean():.4f} openings/in** (4 measured one-inch windows; min {v_count.min():.4f}, max {v_count.max():.4f}).",
f"Diagonal family: mean **{d_count.mean():.4f} openings/in** (12 measured one-inch windows across four regions; min {d_count.min():.4f}, max {d_count.max():.4f}).",
"",
"Rounded nominal classification: **approximately 5 × 5 mesh**.",
"",
"| Wire family | Region | Starting wire | Complete pitches | Partial pitch | Mesh per inch |",
"|---|---|---:|---:|---:|---:|"
]
for d in samples:
    report.append(f"| {d['family']} | {d.get('region','y=680')} | {d['start_wire_index_one_based']} | {d['complete_center_to_center_pitches']} | {d['fractional_final_pitch']:.4f} | {d['linear_mesh_count_per_inch']:.4f} |")
report+=["","### Notes"]+["- "+s for s in results["limitations"]]
(out/"mesh_linear_one_inch_report.md").write_text("\n".join(report)+"\n",encoding="utf-8")

# Overlay: a representative 1-inch perpendicular segment for each family.
overlay=color.copy()
v_example=samples[1] # horizontal x~202 to 318 on y=680
x0=v_example["start_coordinate_along_wire_normal_px"]
vstart=(int(round(x0)),680)
vend=(int(round(x0+inch_px)),680)
cv2.line(overlay,vstart,vend,(0,150,250),3,cv2.LINE_AA)
cv2.circle(overlay,vstart,5,(0,20,255),-1,cv2.LINE_AA)
cv2.circle(overlay,vend,5,(0,20,255),-1,cv2.LINE_AA)
cv2.putText(overlay,"1 in vertical-family count",(105,662),cv2.FONT_HERSHEY_SIMPLEX,.46,(0,20,190),1,cv2.LINE_AA)

d_example=next(d for d in samples if d["family"]=="diagonal" and d.get("region")=="A" and d["start_wire_index_one_based"]==5)
n=np.array(diagonal_centers["A"]["normal"])
region=diagonal_centers["A"]["region_xyxy"]
mid=np.array([(region[0]+region[2])/2,(region[1]+region[3])/2],dtype=float)
projection=float(n@mid)
point=mid+(d_example["start_coordinate_along_wire_normal_px"]-projection)*n
point2=point+inch_px*n
assert all(5<q<719 for q in (*point,*point2)),(point,point2)
start=tuple(int(round(q)) for q in point)
end=tuple(int(round(q)) for q in point2)
cv2.line(overlay,start,end,(0,235,50),3,cv2.LINE_AA)
cv2.circle(overlay,start,5,(0,160,20),-1,cv2.LINE_AA)
cv2.circle(overlay,end,5,(0,160,20),-1,cv2.LINE_AA)
cv2.putText(overlay,"1 in diagonal-family count",(start[0]-75,start[1]+25),cv2.FONT_HERSHEY_SIMPLEX,.46,(20,140,15),1,cv2.LINE_AA)
assert cv2.imwrite(str(out/"one_inch_count_segments.png"),overlay)
assert cv2.imread(str(out/"one_inch_count_segments.png")).shape==(724,724,3)
assert len(list(out.iterdir()))==4

for i,d in enumerate(samples):
 print("COUNT",d["family"],d.get("region","y680"),"wire",d["start_wire_index_one_based"],"whole",d["complete_center_to_center_pitches"],"fraction",round(d["fractional_final_pitch"],4),"per_inch",round(d["linear_mesh_count_per_inch"],4))
print("SUMMARY_VERTICAL",round(float(v_count.mean()),5),"RANGE",round(float(v_count.min()),5),round(float(v_count.max()),5))
print("SUMMARY_DIAGONAL",round(float(d_count.mean()),5),"RANGE",round(float(d_count.min()),5),round(float(d_count.max()),5))
print("NOMINAL_1IN_PIXELS",round(inch_px,5))
print("VALIDATION","16 one-inch windows, 4 near-vertical, 12 diagonal; both drawn segments 116.357px and all output files readable")
for p in sorted(out.iterdir()):
 print("OUTPUT",str(p),"size",p.stat().st_size,"sha256",hashlib.sha256(p.read_bytes()).hexdigest())

