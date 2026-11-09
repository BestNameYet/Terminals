import csv,json,math,hashlib,cv2,numpy as np
from pathlib import Path
from scipy.signal import savgol_filter
root=Path('terminal/tasks/fishFry');dest=root/'outer_rim_radial_measurements_20261109'
base=root/'pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724_arrow_removed_opencv_base.png'
sob=root/'pizza_screen_upper_right_724x724_arrow_removed_sobel_x.png'
orig=root/'pizza_screen_minus01_centered_1448x1448_rotated_cw0p5_clean_upper_right_724x724.png'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='7e07015264f782664407afe6ad3bc852b370651e4020b4bb524910f284dfb14e'
assert hashlib.sha256(sob.read_bytes()).hexdigest()=='50a9d08fc4d88831b06523aced7b75e69d845cf1db0e276aeb20f3fbabbbf944'
a=cv2.imread(str(base));s=cv2.imread(str(sob));o=cv2.imread(str(orig))
assert all(z is not None and z.shape==(724,724,3) for z in (a,s,o))
roi=np.zeros((724,724),np.uint8);roi[430:,640:]=(o[430:,640:].max(2)<100).astype('uint8')
n,label,stats,_=cv2.connectedComponentsWithStats(roi,8)
ids=[j for j in range(1,n) if stats[j,cv2.CC_STAT_AREA]>1000]
assert len(ids)==1
mask=cv2.dilate((label==ids[0]).astype('uint8'),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
def contaminated(theta,r):
 t=math.radians(theta)
 for d in [-8,-4,0,4,8,12]:
  x=int(round((r+d)*math.sin(t)));y=int(round(724-(r+d)*math.cos(t)))
  if 0<=x<724 and 0<=y<724 and mask[y,x]:return True
 return False
blur=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),(0,0),2.5)
theta=np.arange(0,89.0001,.5)
grid=np.arange(652,723.0001,.25,dtype='float32')
rr=[];grad=[];flags=[]
for deg in theta:
 rad=math.radians(float(deg))
 xs=(grid*math.sin(rad)).astype('float32')[None,:]
 ys=(724-grid*math.cos(rad)).astype('float32')[None,:]
 v=cv2.remap(blur,xs,ys,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE).reshape(-1).astype(float)
 inner=float(np.median(v[(grid>=685)&(grid<=694)]))
 outer=float(np.median(v[(grid>=720)&(grid<=722.5)]))
 deriv=np.gradient(v,.25)
 inds=np.flatnonzero((grid>694)&(grid<719))
 rgrad=float(grid[inds[np.argmax(deriv[inds])]])
 cut=(inner+outer)*.5
 crosses=np.flatnonzero((grid[:-1]>690)&(grid[:-1]<720)&(v[:-1]<cut)&(v[1:]>=cut))
 rval=float(grid[crosses[-1]])+.25*(cut-v[crosses[-1]])/(v[crosses[-1]+1]-v[crosses[-1]]) if len(crosses) else rgrad
 rr.append(rval);grad.append(rgrad)
 flags.append(outer<235 or abs(rval-rgrad)>4 or contaminated(float(deg),rval))
rr=np.asarray(rr);grad=np.asarray(grad)
assert len(rr)==179 and np.all((rr>694)&(rr<720)),(float(rr.min()),float(rr.max()))
r=savgol_filter(rr,15,3)
assert np.max(np.abs(r-rr))<5
rad=np.deg2rad(theta);x=r*np.sin(rad);y=724-r*np.cos(rad)
arc=np.r_[0,np.cumsum(np.hypot(np.diff(x),np.diff(y)))]
total=float(arc[-1]);assert 1060<total<1150,total
target=np.linspace(0,total,5)
ang=np.interp(target,arc,theta);rval=np.interp(ang,theta,r)
scale=float(np.median(r)/6)
rows=[]
for i in range(5):
 t=float(ang[i]);radius=float(rval[i])
 rows.append({'point':i+1,'angle_deg':round(t,3),
  'x_px':round(radius*math.sin(math.radians(t)),3),
  'y_px':round(724-radius*math.cos(math.radians(t)),3),
  'radius_px':round(radius,3),
  'arc_from_previous_px':None if i==0 else round(total/4,3),
  'radius_nominal_in':round(radius/scale,4),
  'flagged_inpaint_or_low_contrast':bool(contaminated(t,radius) or np.interp(t,theta,np.array(flags,dtype=float))>0.1)})
dest.mkdir(exist_ok=True)
with (dest/'equal_arc_radii.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
with (dest/'outer_rim_trace.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['angle_deg','radius_raw_px','radius_smoothed_px','radial_gradient_peak_px','cumulative_arc_px','flagged'])
 for z in zip(theta,rr,r,grad,arc,flags):w.writerow([round(float(v),4) for v in z[:-1]]+[bool(z[-1])])
result={'origin_px':[0,724],'nominal_diameter_inches':12,'reference_arc_angles_deg':[0,89],
 'note':'exact 90 degree ray is on excluded y=724 boundary; last direct sample is at 89 degrees',
 'measured_arc_px':total,'measured_arc_inches_approx':total/scale,
 'nominal_px_per_inch':scale,'equal_arc_interval_px':total/4,'equal_arc_interval_inches_approx':total/(4*scale),
 'ideal_full_90_deg_arc_inches':3*math.pi,'radius_min_raw_px':float(min(rr)),'radius_max_raw_px':float(max(rr)),
 'method':'50-percent outer rim grayscale transition, Gaussian sigma 2.5px and Savitzky-Golay angular smoothing',
 'note_quality':'near arrow removal image inpainting; flagged measurements less reliable',
 'samples':rows}
(dest/'outer_rim_results.json').write_text(json.dumps(result,indent=2)+'\n')
report=['# Outer rim radial measurements','',
 'Origin O=(0,724) at original full-image center; angles clockwise from up.',
 f'Nominal 12-inch diameter; measured 0–89-degree arc {total:.3f} px = approximately {total/scale:.3f} in using {scale:.3f} px per nominal inch.',
 f'Four equal outer-rim arc intervals {total/4:.3f} px each = approximately {total/(4*scale):.3f} nominal inches.',
 f'Theoretical full 90-degree 12-inch-screen outer arc 3*pi = {3*math.pi:.3f} in. The 90-degree ray is outside image bounds.',
 '','| Point | Angle ° | X px | Y px | Origin-to-rim px | Arc since prior px | Quality flag |',
 '|---:|---:|---:|---:|---:|---:|:---|']
for z in rows:
 report.append(f"| {z['point']} | {z['angle_deg']:.3f} | {z['x_px']:.2f} | {z['y_px']:.2f} | {z['radius_px']:.2f} | {z['arc_from_previous_px'] if z['arc_from_previous_px'] is not None else '—'} | {'low' if z['flagged_inpaint_or_low_contrast'] else 'normal'} |")
report+=['','Image-geometry pixel distances, not independent physical caliper measurements. The outer boundary is defined by the grayscale edge transition. Samples near the arrow removal mask rely partly on image inpainting.']
(dest/'outer_rim_report.md').write_text('\n'.join(report)+'\n')
out=s.copy()
poly=np.c_[np.rint(x),np.rint(y)].astype('int32')
cv2.polylines(out,[poly],False,(0,220,255),2,cv2.LINE_AA)
for z in rows:
 x0=int(round(z['x_px']));y0=int(round(z['y_px']))
 cv2.line(out,(0,723),(x0,y0),(40,90,240),1,cv2.LINE_AA)
 cv2.circle(out,(x0,y0),5,(0,255,0),-1,cv2.LINE_AA)
 th=math.radians(z['angle_deg'])
 tx=int(610*math.sin(th));ty=int(724-610*math.cos(th))
 cv2.putText(out,str(z['point']),(min(tx+4,690),max(20,min(ty,700))),cv2.FONT_HERSHEY_SIMPLEX,.65,(0,0,240),2,cv2.LINE_AA)
assert cv2.imwrite(str(dest/'annotated_sobel_radii.png'),out)
assert cv2.imread(str(dest/'annotated_sobel_radii.png')).shape==out.shape
assert len(list(dest.iterdir()))==6
with (dest/'equal_arc_radii.csv').open(newline='') as f:assert len(list(csv.DictReader(f)))==5
print('PIXEL_SCALE',round(scale,4),'TOTAL_ARC_PX',round(total,3),'TOTAL_ARC_IN_NOMINAL',round(total/scale,3),
 'FOUR_EQUAL_ARC_INTERVAL_PX',round(total/4,3))
print('WARNING_FLAGS',sum(z['flagged_inpaint_or_low_contrast'] for z in rows))
for z in rows:print('MEASURED',json.dumps(z,separators=(',',':')))
for p in sorted(dest.iterdir()):print('OUTPUT',p,'SHA256',hashlib.sha256(p.read_bytes()).hexdigest())
print('MEASUREMENT_VALIDATED')

