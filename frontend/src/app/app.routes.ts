import { Routes } from '@angular/router';
import { PlantsComponent } from './components/plants/plants.component';
import { ChartComponent } from './components/chart/chart.component';

export const routes: Routes = [
  {path: '', redirectTo: '/charts', pathMatch: 'full'},
  {path: 'charts', component: ChartComponent},
  {path: 'plants', component: PlantsComponent}
];
