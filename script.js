const select = document.querySelector("#month-select");

const expensesChartContainer = document.querySelector('[data-donut-chart="expenses"]');
const incomeChartContainer = document.querySelector('[data-donut-chart="income"]');
const investmentsChartContainer = document.querySelector('[data-donut-chart="investments"]');

var expensesChart = "";
var incomeChart = "";
var investmentsChart = "";

const expensesData = [];
const incomeData = [];
const investmentsData = [];


class DataTransformer {
    static transformData(jsonData) {
        let totalPercentage = Math.min((jsonData.value / jsonData.goal) * 100, 100);
        let actualTotal = (jsonData.value / jsonData.goal) * 100;

        let wedges = Object.entries(jsonData.subcategories).map(([subcatName, subcatData]) => {
            let subcatPercentage = (subcatData.value / jsonData.value) * totalPercentage;
            return {
                id: subcatName,
                value: subcatPercentage
            };
        });

        wedges.sort((a, b) => b.value - a.value);

        if (actualTotal < 100) {
            let emptyWedgePercentage = 100 - totalPercentage;

            wedges.push({
                id: 'empty',
                value: emptyWedgePercentage
            });
        }

        return {
            total: totalPercentage,
            actualTotal,
            wedges
        };
    }
}

class ColorGenerator {
    static randomRgbColor() {
        let r = Math.floor(Math.random() * 256);
        let g = Math.floor(Math.random() * 256);
        let b = Math.floor(Math.random() * 256);
        return `rgb(${r},${g},${b})`;
    }
}

class SVGPathGenerator {
    constructor(radius) {
        this.radius = radius;
    }

    calculatePath(value, offset) {
        const startAngle = offset;
        const endAngle = offset + (360 * value / 100);
        const start = this.polarToCartesian(this.radius, startAngle);
        const end = this.polarToCartesian(this.radius, endAngle);
        const largeArcFlag = value > 50 ? 1 : 0;

        return [
      `M ${this.radius},${this.radius}`,
      `L ${start.x},${start.y}`,
      `A ${this.radius},${this.radius} 0 ${largeArcFlag} 1 ${end.x},${end.y}`,
      "Z"
    ].join(" ");
    }

    polarToCartesian(radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: radius + (radius * Math.cos(angleInRadians)),
            y: radius + (radius * Math.sin(angleInRadians))
        };
    }
}

class DonutChart {
    constructor(options) {
        this.init(options);
    }

    init(options = {}) {
        if (!options.container || !options.jsonData) {
            console.error('Initialization error: container and jsonData must be provided.');
            return;
        }

        this.config = {
            container: options.container,
            data: DataTransformer.transformData(options.jsonData),
            label: 'Total',
            offset: 0
        };

        this.createChartStructure();
        this.build();
    }

    createChartStructure() {
        try {
            const inner = document.createElement('div');
            inner.className = 'inner-circle';
            const label = document.createElement('div');
            label.className = 'inner-circle-label';
            const value = document.createElement('div');
            value.className = 'inner-circle-value';

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add('donut-chart-svg');
            svg.setAttribute('viewBox', `0 0 100 100`);
            svg.setAttribute('width', '85%');
            svg.setAttribute('height', '85%');

            this.config.container.appendChild(svg);
            this.config.container.appendChild(inner);
            inner.appendChild(label);
            inner.appendChild(value);
        } catch (error) {
            console.error('Error creating chart structure:', error);
        }
    }

    build() {
        const svg = this.config.container.querySelector('.donut-chart-svg');
        svg.innerHTML = ''; // Clear existing content
        this.config.offset = 0;

        this.config.data.wedges.forEach(wedgeData => {
            this.createWedge(wedgeData, svg);
        });

        this.setChartMeta();
    }

    createWedge(data, svg) {
        const path = this.createSVGPath(data, svg);
        svg.appendChild(path);
        this.config.offset += (360 * data.value) / 100;
    }

    createSVGPath(data, svg) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('fill', data.id !== "empty" ? ColorGenerator.randomRgbColor() : 'none');
        path.setAttribute('d', this.calculatePathData(data.value, this.config.offset));
        return path;
    }

    calculatePathData(value, offset) {
        const svgPathGenerator = new SVGPathGenerator(50);
        return svgPathGenerator.calculatePath(value, offset);
    }

    setChartMeta() {
        let label = this.config.container.querySelector('.inner-circle-label');
        let value = this.config.container.querySelector('.inner-circle-value');
        label.innerHTML = this.config.label;
        value.innerHTML = `${Math.round(this.config.data.actualTotal * 10) / 10}%`;
    }

    update(jsonData) {
        let newData = DataTransformer.transformData(jsonData);
        this.config.data = newData;
        this.config.offset = 0;
        this.build();
    }
}

//initialization code for demo below
document.addEventListener('DOMContentLoaded', function () {
    (async () => {
        try {
            [expensesData[0], incomeData[0], investmentsData[0]] = await Promise.all([
                loadData(`./JSONs/january/expenses-data.json`),
                loadData(`./JSONs/january/income-data.json`),
                loadData(`./JSONs/january/investments-data.json`)
            ]);

            [expensesData[1], incomeData[1], investmentsData[1]] = await Promise.all([
                loadData(`./JSONs/february/expenses-data.json`),
                loadData(`./JSONs/february/income-data.json`),
                loadData(`./JSONs/february/investments-data.json`)
            ]);

            [expensesData[2], incomeData[2], investmentsData[2]] = await Promise.all([
                loadData(`./JSONs/march/expenses-data.json`),
                loadData(`./JSONs/march/income-data.json`),
                loadData(`./JSONs/march/investments-data.json`)
            ]);

            createCharts(select.value);
        } catch (error) {
            console.error("An error occurred during initialization:", error.message);
        }
    })();
});

async function createCharts(selectItem) {
    expensesChart = new DonutChart({
        container: expensesChartContainer,
        jsonData: expensesData[0]
    });

    incomeChart = new DonutChart({
        container: incomeChartContainer,
        jsonData: incomeData[0]
    });

    investmentsChart = new DonutChart({
        container: investmentsChartContainer,
        jsonData: investmentsData[0]
    });
}

async function loadData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    var responseJson = response.json()
    return await responseJson;
}

select.addEventListener("change", () => {
    var i;
    switch (select.value) {
        case "january": {
            i = 0;
            break;
        }
        case "february": {
            i = 1;
            break;
        }
        case "march": {
            i = 2;
            break;
        }
    }
    expensesChart.update(expensesData[i]);
    incomeChart.update(incomeData[i]);
    investmentsChart.update(investmentsData[i]);
});
