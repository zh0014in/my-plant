import { Component, OnInit, OnDestroy, ViewChildren, ElementRef, QueryList, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart, LinearScale, PointElement, Tooltip, Legend, TimeScale, LineController, LineElement, Title } from 'chart.js';
import { io } from 'socket.io-client';
import 'chartjs-adapter-moment';
import { Data } from './Data';
import { HttpClient } from '@angular/common/http';
import { NgFor } from '@angular/common';

const baseConfig: any = {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Real-Time Data',
      data: [],
      fill: false,
      borderColor: 'rgba(75, 192, 192, 1)',
      tension: 0.1
    }]
  },
  options: {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'second'
        }
      },
      y: {
        beginAtZero: true
      }
    }
  }
}
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgFor],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit{
  @ViewChildren('pr_chart', { read: ElementRef }) chartElementRefs: QueryList<ElementRef> | undefined;
  url: string = "http://192.168.1.131:8080";
  dataPointsToKeep: number = 100;
  //chart: any;
  socket: any;
  pinCount: Array<number> = [];
  charts:  Array<any> = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }
  ngAfterViewInit(): void {
    this.http.get<number>(`${this.url}/pin-count`).subscribe({
      next: (pinCount) => {
        this.pinCount = Array.from(new Array(pinCount), (_, i) => i+1);
        this.cdr.detectChanges();

        if(this.chartElementRefs)
          this.charts = this.chartElementRefs.map((chartElementRef, index) => {
            const config = Object.assign({}, baseConfig);

            return new Chart(chartElementRef.nativeElement, config);
          });
      }
    })

  }

  ngOnInit() {
    Chart.register(LinearScale, PointElement, Tooltip, Legend, TimeScale, LineController, LineElement, Title);
        this.socket = io(this.url);

        this.socket.on('initialData', (data: Data[]) => {
          this.updateChartBatch(data);
        });
        // Listen for new data points from the server
        this.socket.on('newDataPoint', (data: Data) => {
          this.updateChart(data);
        });

  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  updateChart(data: Data) {
    const { datetime, moisture, pin } = data;
    if(this.charts.length === 0) return;
    // Add new data
    this.charts[0].data.labels.push(new Date(datetime));
    this.charts[0].data.datasets[0].data.push(moisture);

    if (this.charts[0].data.labels.length > this.dataPointsToKeep) {
      this.charts[0].data.labels.shift();
      this.charts[0].data.datasets[0].data.shift();
    }

    this.charts[0].update();
  }

  updateChartBatch(data: Data[]) {
    if(this.charts.length === 0) return;
    // Add new data
    for(let i = 0; i < data.length; i++) {
      const { datetime, moisture, pin } = data[i];
      this.charts[0].data.labels.push(new Date(datetime));
      this.charts[0].data.datasets[0].data.push(moisture);
    }

    this.charts[0].update();
  }
}
