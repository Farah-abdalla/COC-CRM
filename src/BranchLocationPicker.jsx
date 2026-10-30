import React,{useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import {LocateFixed,MapPin,Crosshair} from 'lucide-react';
import {t,useLanguage} from './i18n';
import {validBranchCoordinates,branchMapUrl} from './branchLocations';
import 'leaflet/dist/leaflet.css';
import './branchLocations.css';
const pin=L.divIcon({className:'branch-map-pin',html:'<span></span>',iconSize:[26,34],iconAnchor:[13,34]});
export default function BranchLocationPicker({value,onChange}){
 useLanguage();
 const container=useRef(null),map=useRef(null),marker=useRef(null),change=useRef(onChange),alive=useRef(true);
 change.current=onChange;
 const [locating,setLocating]=useState(false),[error,setError]=useState(''),[tileError,setTileError]=useState(false);
 const selected=validBranchCoordinates(value.latitude,value.longitude);
 useEffect(()=>{
  alive.current=true;
  const instance=L.map(container.current,{scrollWheelZoom:false}).setView(selected?[Number(value.latitude),Number(value.longitude)]:[30.0444,31.2357],selected?17:11);
  map.current=instance;
  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).on('tileerror',()=>{if(alive.current)setTileError(true);}).addTo(instance);
  instance.on('click',event=>change.current({latitude:Number(event.latlng.lat.toFixed(6)),longitude:Number(event.latlng.wrap().lng.toFixed(6))}));
  const resize=new ResizeObserver(()=>instance.invalidateSize());resize.observe(container.current);
  return()=>{alive.current=false;resize.disconnect();instance.remove();map.current=null;marker.current=null;};
 },[]);
 useEffect(()=>{
  const instance=map.current;if(!instance)return;
  if(!selected){marker.current?.remove();marker.current=null;return;}
  const point=L.latLng(Number(value.latitude),Number(value.longitude));
  if(!marker.current){marker.current=L.marker(point,{icon:pin,draggable:true,title:t('Branch location pin'),alt:t('Branch location pin')}).addTo(instance);marker.current.on('dragend',()=>{const next=marker.current.getLatLng().wrap();change.current({latitude:Number(next.lat.toFixed(6)),longitude:Number(next.lng.toFixed(6))});});}
  else marker.current.setLatLng(point);
  if(!instance.getBounds().contains(point))instance.setView(point,17);
 },[value.latitude,value.longitude,selected]);
 function useCenter(){const point=map.current?.getCenter().wrap();if(point)onChange({latitude:Number(point.lat.toFixed(6)),longitude:Number(point.lng.toFixed(6))});}
 function locate(){
  setError('');
  if(!window.isSecureContext||!navigator.geolocation){setError('Current location is unavailable. Select the branch on the map or enter coordinates.');return;}
  setLocating(true);
  navigator.geolocation.getCurrentPosition(position=>{
   if(!alive.current)return;
   const {latitude,longitude}=position.coords;
   if(validBranchCoordinates(latitude,longitude)){change.current({latitude:Number(latitude.toFixed(6)),longitude:Number(longitude.toFixed(6))});map.current?.setView([latitude,longitude],18);}else setError('The device returned an invalid location.');
   setLocating(false);
  },()=>{if(alive.current){setError('Unable to detect your location. Allow location access, select a map point, or enter coordinates.');setLocating(false);}},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 }
 return <section className="branch-location-picker" aria-label={t('Branch location')}>
  <div className="branch-location-heading"><h3><MapPin size={18}/>{t('Branch location')}</h3><span>{t(selected?'Location selected':'Choose the branch location')}</span></div>
  <label>{t('Branch address')}<input maxLength={500} value={value.address||''} onChange={event=>onChange({address:event.target.value})} placeholder={t('Street, building, district...')}/></label>
  <p className="branch-map-help">{t('Click the map to place the pin. Drag the pin to adjust the exact location, or enter coordinates below.')}</p>
  <div ref={container} className="branch-location-map" role="region" aria-label={t('Branch location map')}/>
  {tileError&&<p role="status" className="branch-map-help">{t('Map tiles could not load. You can still enter coordinates.')}</p>}
  <div className="branch-map-actions"><button type="button" className="secondary" disabled={locating} onClick={locate}><LocateFixed size={16}/>{t(locating?'Detecting location...':'Use my current location')}</button><button type="button" className="secondary" onClick={useCenter}><Crosshair size={16}/>{t('Select map center')}</button></div>
  {error&&<p className="account-error" role="alert">{t(error)}</p>}
  <div className="form-grid"><label>{t('Latitude')}<input aria-label={t('Branch latitude')} type="number" min="-90" max="90" step="any" value={value.latitude??''} onChange={event=>onChange({latitude:event.target.value})} placeholder="30.044400"/></label><label>{t('Longitude')}<input aria-label={t('Branch longitude')} type="number" min="-180" max="180" step="any" value={value.longitude??''} onChange={event=>onChange({longitude:event.target.value})} placeholder="31.235700"/></label></div>
  {selected&&<a className="branch-map-preview" href={branchMapUrl(value)} target="_blank" rel="noopener noreferrer">{t('Open selected location in map')}</a>}
 </section>;
}