import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import Plant from './Plant';
import { NgFor } from '@angular/common';
import {ReactiveFormsModule, FormGroup, FormControl} from '@angular/forms';

@Component({
  selector: 'app-plants',
  standalone: true,
  imports: [NgFor, ReactiveFormsModule],
  templateUrl: './plants.component.html',
  styleUrl: './plants.component.scss'
})
export class PlantsComponent implements OnInit {
  url: string = "http://192.168.1.131:8080";
  plants: Plant[] = [];

  addPlantForm = new FormGroup({
    name: new FormControl(''),
    pin: new FormControl('')
  })

  constructor(private http: HttpClient){}
  ngOnInit(): void {
    this.http.get<Plant[]>(this.url + "/plants").subscribe({
      next: (data) => {
        console.log(data);
        this.plants = data;
      }
    })
  }

  addPlant(){
    console.log(this.addPlantForm.value);
    this.http.post(this.url + "/plants", this.addPlantForm.value).subscribe({
      next: (data) => {
        console.log(data);
        this.ngOnInit();
      }
    })
  }
}
