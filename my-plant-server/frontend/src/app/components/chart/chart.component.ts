import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  ElementRef,
  QueryList,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import {
  Chart,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale,
  LineController,
  LineElement,
  Title,
  CategoryScale,
} from 'chart.js';
import { io } from 'socket.io-client';
import 'chartjs-adapter-moment';
import { Data } from './Data';
import { HttpClient } from '@angular/common/http';
import { NgFor } from '@angular/common';
import moment from 'moment';
import Plant from '../plants/Plant';

const baseConfig: any = {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Real-Time Data',
        data: [],
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
        text: 'Chart.js Line Chart',
      },
    },
    scales: {
    },
  },
};
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgFor],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
})
export class ChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('pr_chart', { read: ElementRef }) chartElementRefs:
    | QueryList<ElementRef>
    | undefined;
  url: string = 'http://192.168.1.131:8080';
  dataPointsToKeep: number = 100;
  //chart: any;
  socket: any;
  pinCount: Array<number> = [];
  charts: Array<any> = [];
  mapPinToChart: Map<number, number> = new Map();
  mapPinToPlantName: Map<number, string> = new Map();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}
  ngAfterViewInit(): void {

    this.http.get<any>(`${this.url}/pin-count`).subscribe({
      next: (result) => {
        let pc = result[0]['c'];
        console.log('pc', pc);
        this.pinCount = Array.from(new Array(pc), (_, i) => i + 1);
        this.cdr.detectChanges();

        if (this.chartElementRefs)
          this.charts = this.chartElementRefs.map((chartElementRef, index) => {
            const config = JSON.parse(JSON.stringify(baseConfig));

            return new Chart(chartElementRef.nativeElement, config);
          });
      },
    });
  }

  ngOnInit() {
    Chart.register(
      LinearScale,
      PointElement,
      Tooltip,
      Legend,
      TimeScale,
      LineController,
      LineElement,
      Title,
      CategoryScale
    );
    this.http.get<Plant[]>(`${this.url}/plants`).subscribe({
      next: (result) => {
        result.forEach((plant, index) => {
          this.mapPinToPlantName.set(plant.pin, plant.name);
        });
        this.setupSocket();
      }
    });

  }

  setupSocket(){
    this.socket = io(this.url);

    this.socket.on('initialData', (data: Data[]) => {
      this.updateChartBatch(data);
    });
    // Listen for new data points from the server
    this.socket.on('newDataPoint', (data: Data) => {
      const { pin } = data;
      if (this.mapPinToChart.has(pin)) {
        const index = this.mapPinToChart.get(pin) || 0;
        console.log('updating chart index for pin', index, pin);
        this.updateChart(data, index);
      }
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  updateChart(data: Data, index: number) {
    if (this.charts.length === 0) return;
    const { datetime, moisture } = data;
    console.log('received data', data);

    // Add new data
    this.charts[index].data.labels.push(this.convertDateStringToDate(datetime));
    this.charts[index].data.datasets[0].data.push(moisture);

    if (this.charts[index].data.labels.length > this.dataPointsToKeep) {
      this.charts[index].data.labels.shift();
      this.charts[index].data.datasets[0].data.shift();
    }

    this.charts[index].update();
  }

  updateChartBatch(data: Data[]) {
    let group = this.groupBy(data, 'pin');
    console.log('group', group);
    if (this.charts.length === 0) return;
    // Add new data
    let keys = Object.keys(group);
    console.log('keys', keys);
    for (let i = 0; i < keys.length; i++) {
      this.mapPinToChart.set(parseInt(keys[i]), i);
      this.charts[i].data.datasets[0].label = this.mapPinToPlantName.get(parseInt(keys[i]));
      for (let j = 0; j < group[keys[i]].length; j++) {
        const { datetime, moisture } = group[keys[i]][j];
        this.charts[i].data.labels.push(this.convertDateStringToDate(datetime, -8));
        this.charts[i].data.datasets[0].data.push(moisture);
      }
      this.charts[i].update();
    }
  }

  groupBy(xs: Array<any>, key: any) {
    return xs.reduce(function (rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }

  convertDateStringToDate(input: string, offset: number = 0) {
    let regexIso8601 =
      /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
    let match = input.match(regexIso8601);
    if (!match) {
      return;
    }
    let milliseconds = Date.parse(match[0]);
    if (!isNaN(milliseconds)) {
      let date = new Date(milliseconds);
      date.setHours(date.getHours() + offset);
      let datetime = moment.utc(date).local().toDate();
      return `${datetime.getMonth()+1}-${datetime.getDate()} ${datetime.getHours()}`;
    }
    return '';
  }
}
