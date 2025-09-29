import { Component, OnInit, inject } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { DataService } from '../data.service';
import { ActivatedRoute, Router } from '@angular/router';

import * as L from 'leaflet';
import { icon, Marker } from 'leaflet';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  standalone: false,
})
export class CreatePage implements OnInit {

  map!: L.Map;
  marker!: L.Marker;

  title = 'Create Point';
  name = '';
  coordinates = '';

  isEditMode = false;
  pointId: string | null = null;

  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private dataService = inject(DataService);
  private route = inject(ActivatedRoute);

  constructor() { }

  ngOnInit() {
    this.pointId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.pointId;

    if (this.isEditMode) {
      this.title = 'Edit Point';
    }

    setTimeout(() => {
      this.map = L.map('mapcreate').setView([-7.7956, 110.3695], 13);

      var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });

      var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'ESRI'
      });

      osm.addTo(this.map);

      var baseMaps = {
        "OpenStreetMap": osm,
        "Esri World Imagery": esri
      };

      L.control.layers(baseMaps).addTo(this.map);

      var tooltip = 'Drag the marker or move the map<br>to change the coordinates<br>of the location';
      this.marker = L.marker([-7.7956, 110.3695], { draggable: true });
      this.marker.addTo(this.map);
      this.marker.bindPopup(tooltip);
      this.marker.openPopup();

      this.marker.on('dragend', (e) => {
        let latlng = e.target.getLatLng();
        let lat = latlng.lat.toFixed(9);
        let lng = latlng.lng.toFixed(9);
        this.coordinates = lat + ',' + lng;
        console.log(this.coordinates);
      });

      if (this.isEditMode && this.pointId) {
        this.dataService.getPoint(this.pointId).then(snapshot => {
          const point = snapshot.val();
          if (point) {
            this.name = point.name;
            this.coordinates = point.coordinates;
            const coords = this.coordinates.split(',').map(c => parseFloat(c));
            const latLng = new L.LatLng(coords[0], coords[1]);
            this.map.setView(latLng, 13);
            this.marker.setLatLng(latLng);
          }
        });
      }
    });
  }

  async save() {
    if (this.name && this.coordinates) {
      try {
        if (this.isEditMode && this.pointId) {
          await this.dataService.updatePoint(this.pointId, { name: this.name, coordinates: this.coordinates });
        } else {
          await this.dataService.savePoint({ name: this.name, coordinates: this.coordinates });
        }
        this.navCtrl.back();
      } catch (error: any) {
        const alert = await this.alertCtrl.create({
          header: 'Save Failed',
          message: error.message,
          buttons: ['OK'],
        });
        await alert.present();
      }
    }
  }
}
