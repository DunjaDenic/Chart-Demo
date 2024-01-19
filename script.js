const select = document.querySelector("#month-select");
const numberSection = document.querySelector("#number-section");

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
                percentage: subcatPercentage,
                moneyValue: subcatData.value
            };
        });

        wedges.sort((a, b) => b.percentage - a.percentage);

        // Collapse additional wedges into "Other"
        if (wedges.length > 5) {
            let otherWedges = wedges.slice(5);
            let otherTotal = otherWedges.reduce((acc, curr) => acc + curr.moneyValue, 0);
            let otherPercentage = otherWedges.reduce((acc, curr) => acc + curr.percentage, 0);

            wedges = wedges.slice(0, 5).concat({
                id: 'other',
                percentage: otherPercentage,
                moneyValue: otherTotal
            });
        }

        if (actualTotal < 100) {
            let emptyWedgePercentage = 100 - totalPercentage;
            wedges.push({
                id: 'empty',
                percentage: emptyWedgePercentage,
                moneyValue: 0
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
    static generateGraduatedColors(baseColor, numberOfWedges) {
        let colors = [];
        const baseHsl = this.extractHslComponents(baseColor);
        const lightnessIncrement = 20 / numberOfWedges;

        for (let i = 0; i < numberOfWedges; i++) {
            let lightness = baseHsl.lightness + (lightnessIncrement * i);
            colors.push(`hsl(${baseHsl.hue}, ${baseHsl.saturation}%, ${lightness}%)`);
        }

        return colors;
    }

    static extractHslComponents(hslString) {
        let [hue, saturation, lightness] = hslString.match(/\d+/g);
        return {
            hue: parseInt(hue),
            saturation: parseInt(saturation),
            lightness: parseInt(lightness)
        };
    }
}

class SVGPathGenerator {
    constructor(radius) {
        this.radius = radius;
    }

    calculatePath(percentage, offset) {
        const startAngle = offset;
        const endAngle = offset + (360 * percentage / 100);
        const start = this.polarToCartesian(this.radius, startAngle);
        const end = this.polarToCartesian(this.radius, endAngle);
        const largeArcFlag = percentage > 50 ? 1 : 0;

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
            svg.setAttribute('viewBox', `-5 -5 110 110`);
            svg.setAttribute('width', '90%');
            svg.setAttribute('height', '90%');

            this.config.container.appendChild(svg);
            this.config.container.appendChild(inner);
            inner.appendChild(label);
            inner.appendChild(value);
        } catch (error) {
            console.error('Error creating chart structure:', error);
        }
    }

    build() {
        const chartWrapper = this.config.container.closest('.chart-wrapper');
        const existingOverview = chartWrapper.querySelector('.number-display');
        if (existingOverview) {
            existingOverview.remove();
        }

        const svg = this.config.container.querySelector('.donut-chart-svg');
        svg.innerHTML = '';
        this.config.offset = 0;

        const baseColor = getComputedStyle(document.documentElement)
            .getPropertyValue(`--${this.config.container.dataset.donutChart}`);
        const colors = ColorGenerator.generateGraduatedColors(baseColor.trim(), this.config.data.wedges.length);

        this.config.data.wedges.forEach((wedgeData, index) => {
            const color = wedgeData.id !== 'empty' ? colors[index] : 'none';
            this.createWedge(wedgeData, svg, color);
        });

        this.setChartMeta();

        this.createOverview(chartWrapper, this.config.data.wedges, colors);
    }

    createWedge(data, svg, color) {
        const path = this.createSVGPath(data, svg, color);
        svg.appendChild(path);
        this.config.offset += (360 * data.percentage) / 100;
    }

    createSVGPath(data, svg, color, index) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('fill', color);
        path.setAttribute('d', this.calculatePathData(data.percentage, this.config.offset));
        path.classList.add(`chart-path-${index}`); // Assign a unique class
        return path;
    }

    calculatePathData(percentage, offset) {
        const svgPathGenerator = new SVGPathGenerator(50);
        return svgPathGenerator.calculatePath(percentage, offset);
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

    createOverview(container, data, colors) {
        const overview = document.createElement('div');
        overview.className = 'number-display';
        overview.style.width = '100%'; // Ensure the overview takes full width

        let total = 0;
        data.forEach((wedge, index) => {
            // Skip the 'empty' wedge
            if (wedge.id === 'empty') return;

            total += wedge.moneyValue; // Calculate the total value for non-empty wedges

            const item = document.createElement('div');
            item.className = 'expense-item';

            // Create the colored square
            const colorSquare = document.createElement('span');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = colors[index]; // Use the corresponding color

            const name = document.createElement('span');
            name.className = 'expense-name';
            name.textContent = wedge.id;

            const value = document.createElement('span');
            value.className = 'expense-value';
            value.textContent = wedge.moneyValue.toLocaleString();

            item.appendChild(colorSquare);
            item.appendChild(name);
            item.appendChild(value);
            overview.appendChild(item);
        });

        // Add the total
        const totalItem = document.createElement('div');
        totalItem.className = 'expense-item total';
        const totalName = document.createElement('span');
        totalName.textContent = 'Total';
        const totalValue = document.createElement('span');
        totalValue.textContent = total.toLocaleString();
        totalItem.appendChild(totalName);
        totalItem.appendChild(totalValue);
        overview.appendChild(totalItem);

        container.appendChild(overview);
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
