import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ReactElement } from "react";

type MortgageDonutChartProps = {
  principalAmount: number;
  interestAmount: number;
  formatValue: (value: number) => string;
};

function MortgageDonutChart({
  principalAmount,
  interestAmount,
  formatValue,
}: MortgageDonutChartProps): ReactElement {
  const sanitizedPrincipal = Math.max(0, principalAmount);
  const sanitizedInterest = Math.max(0, interestAmount);
  const series = [sanitizedPrincipal, sanitizedInterest];

  const options: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      animations: { enabled: true },
      sparkline: { enabled: true },
    },
    colors: ["#D4A373", "#0E3BFF"],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      // y: {
      //   formatter: (value) => `${formatValue(Math.round(value))} AED`,
      // },
    },
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 270,
        expandOnClick: false,
        donut: {
          size: "66%",
          labels: {
            show: true,
            name: { show: true },
            value: { show: true },
            total: {
              show: true,
              showAlways: true,
              label: "Principal",
              fontSize: "12px",
              fontFamily: "Medium, sans-serif",
              fontWeight: 500,
              color: "#707070",
              formatter: () =>
                `${formatValue(Math.round(sanitizedPrincipal))} AED`,
            },
          },
        },
      },
    },
  };

  return (
    <ReactApexChart options={options} series={series} type="donut" height={280} />
  );
}

export default MortgageDonutChart;


