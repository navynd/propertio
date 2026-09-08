import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ReactElement } from "react";

const priceTrendsCategories = [
  "Jan 25",
  "Feb 25",
  "Mar 25",
  "Apr 25",
  "May 25",
  "Jun 25",
  "Jul 25",
  "Aug 25",
  "Sep 25",
  "Oct 25",
  "Nov 25",
  "Dec 25",
];

const priceTrendsSeries = [
  {
    name: "Al bahia hills @ 432 AED/Sqft",
    data: [0, 120, 205, 95, 80, 130, 150, 315, 280, 260, 150, 220],
  },
  {
    name: "Al bahia @ 432 AED/Sqft",
    data: [0, 70, 95, 55, 40, 65, 120, 180, 230, 320, 220, 140],
  },
];

const priceTrendsOptions: ApexOptions = {
  chart: {
    type: "area",
    toolbar: {
      show: false,
    },
    animations: {
      enabled: true,
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      inverseColors: false,
      opacityFrom: 0.6,
      opacityTo: 0.08,
      stops: [0, 70, 100],
    },
  },
  colors: ["#0E3BFF", "#FF2A2A"],
  yaxis: {
    labels: {
      show: true,
      style: {
        colors: "#222",
        fontSize: "12px",
      },
      formatter: (value) => `${Math.round(value)}`,
    },
    min: 0,
    max: 600,
    tickAmount: 6,
    // title: {
    //   text: "AED/Sqft",
    //   style: {
    //     fontSize: "12px",
    //     fontWeight: 600,
    //     color: "#222",
    //   },
    //   rotate: 0,
    //     offsetX:40,
    //     offsetY: -110,
    // },
    axisBorder: {
      show: true,
      color: "rgba(34, 34, 34, 0.2)",
    },
    axisTicks: {
      show: false,
    },
  },
  xaxis: {
    categories: priceTrendsCategories,
    axisBorder: {
      show: true,
      color: "rgba(34, 34, 34, 0.2)",
    },
    axisTicks: {
      show: false,
    },
    labels: {
      style: {
        colors: "#222",
        fontSize: "12px",
      },
    },
  },
  grid: {
    show: false,
  },
  tooltip: {
    shared: true,
    intersect: false,
    theme: "light",
  },
  legend: {
    show: false,
  },
};

type SplineChartProps = {
  categories?: string[];
  series?: Array<{ name: string; data: number[] }>;
  yAxisMax?: number;
};

function SplineChart({
  categories = priceTrendsCategories,
  series = priceTrendsSeries,
  yAxisMax = 600,
}: SplineChartProps): ReactElement {
  const options: ApexOptions = {
    ...priceTrendsOptions,
    xaxis: {
      ...priceTrendsOptions.xaxis,
      categories,
    },
    yaxis: {
      ...priceTrendsOptions.yaxis,
      max: yAxisMax,
    },
  };

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="area"
      height={260}
    />
  );
}

export default SplineChart;

