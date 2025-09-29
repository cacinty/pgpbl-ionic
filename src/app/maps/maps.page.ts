import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import * as L from 'leaflet';
import { DataService } from '../data.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone: false,
})
export class MapsPage implements OnInit, OnDestroy {

  private dataService = inject(DataService);
  map!: L.Map;
  markers: L.Marker[] = [];
  private pointsChangedSubscription!: Subscription;

  constructor(private alertCtrl: AlertController, private router: Router) { }

  async loadPoints() {
    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    const points: any = await this.dataService.getPoints();
    for (const key in points) {
      if (points.hasOwnProperty(key)) {
        const point = points[key];
        const coordinates = point.coordinates.split(',').map((c: string) => parseFloat(c));
        const marker = L.marker(coordinates as L.LatLngExpression).addTo(this.map);
        // Add marker to array
        this.markers.push(marker);
        const popupContent = `
          ${point.name}<br>
          <div class="popup-icons">
            <ion-icon name="create-outline" class="edit-icon" data-key="${key}"></ion-icon>
            <ion-icon name="trash-outline" class="delete-icon" data-key="${key}"></ion-icon>
          </div>
        `;
        marker.bindPopup(popupContent);
      }
    }
  }

  ngOnInit() {
    this.pointsChangedSubscription = this.dataService.pointsChanged$.subscribe(() => {
      this.loadPoints();
    });
  }

  ngOnDestroy() {
    if (this.pointsChangedSubscription) {
      this.pointsChangedSubscription.unsubscribe();
    }
  }

  ionViewDidEnter() {
    if (!this.map) {
      this.map = L.map('map').setView([-7.7956, 110.3695], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      this.map.invalidateSize();

      this.loadPoints();

      this.map.on('popupopen', (e) => {
        const popup = e.popup.getElement();
        if (popup) {
          const deleteIcon = popup.querySelector('.delete-icon');
          if (deleteIcon) {
            deleteIcon.addEventListener('click', (event) => {
              const key = (event.target as HTMLElement).getAttribute('data-key');
              if (key) {
                this.presentDeleteConfirm(key);
              }
            });
          }

          const editIcon = popup.querySelector('.edit-icon');
          if (editIcon) {
            editIcon.addEventListener('click', (event) => {
              const key = (event.target as HTMLElement).getAttribute('data-key');
              if (key) {
                this.editPoint(key);
              }
            });
          }
        }
      });
    }
  }

  ionViewWillLeave() {
    if (this.map) {
      this.map.remove();
      this.map = null!;
    }
  }

  async presentDeleteConfirm(key: string) {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this point?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            this.deletePoint(key);
          }
        }
      ]
    });
    await alert.present();
  }

  editPoint(key: string) {
    this.router.navigate(['/create', key]);
  }

  deletePoint(key: string) {
    this.dataService.deletePoint(key);
  }
}
