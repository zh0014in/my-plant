import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, LinearScale, PointElement, Tooltip, Legend, TimeScale, LineController, LineElement, Title } from 'chart.js';
import { io } from 'socket.io-client';
import 'chartjs-adapter-moment';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
})
export class ChartComponent implements OnInit, OnDestroy{
  url: string = "http://192.168.1.131:8080";
  chart: any;
  socket: any;

  constructor() { }

  ngOnInit() {
    Chart.register(LinearScale, PointElement, Tooltip, Legend, TimeScale, LineController, LineElement, Title);
    this.socket = io(this.url);
    this.initializeChart();

    // Listen for new data points from the server
    this.socket.on('newDataPoint', (data: any) => {
      this.updateChart(data);
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  initializeChart() {
    this.chart = new Chart('lineChart', {
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
    });
  }

  updateChart(data: any) {
    const { timestamp, value } = data;

    // Add new data
    this.chart.data.labels.push(new Date(timestamp));
    this.chart.data.datasets[0].data.push(value);

    // Remove old data if necessary (e.g., limit to 20 points)
    if (this.chart.data.labels.length > 20) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
    }

    this.chart.update();
  }
}
