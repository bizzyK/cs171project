let selectedMetric = 'growth';

// SVG Size for bar chart
let marginBar = {top: 20, right: 10, bottom: 100, left: 30}, widthBar = 800 - marginBar.left - marginBar.right,
    heightBar = 420 - marginBar.top - marginBar.bottom;

// SVG Size for lollipop chart
let marginLollipop = {top: 20, right: 120, bottom: 75, left: 70},
    widthLollipop = 450 - marginLollipop.left - marginLollipop.right,
    heightLollipop = 400 - marginLollipop.top - marginLollipop.bottom;

// Create SVG container for bar chart
const svgBar = d3.select("#bar-area").append("svg")
    .attr("width", widthBar + marginBar.left + marginBar.right)
    .attr("height", heightBar + marginBar.top + marginBar.bottom)
    .append("g")
    .attr("transform", `translate(${marginBar.left}, ${marginBar.top})`);

// Create SVG container for lollipop chart
const svgLollipop = d3.select("#lollipop-area").append("svg")
    .attr("width", widthLollipop + marginLollipop.left + marginLollipop.right)
    .attr("height", heightLollipop + marginLollipop.top + marginLollipop.bottom)
    .append("g")
    .attr("transform", `translate(${marginLollipop.left}, ${marginLollipop.top})`);


function monthToQuarter(monthYear) {
    const [month, year] = monthYear.split("-");
    const quarterMap = {Mar: "Q1", Jun: "Q2", Sep: "Q3", Dec: "Q4"};
    const fullYear = year.length === 2 ? '20' + year : year;
    return fullYear + " " + quarterMap[month];
}

document.addEventListener('DOMContentLoaded', function () {
    const metricSelect = document.getElementById('metricSelect');
    const cumulativeReturnsHeading = document.querySelector('.col-md-4 h1'); // Select the heading element

    metricSelect.addEventListener('change', function (event) {
        selectedMetric = event.target.value;
        console.log("Selected metric:", selectedMetric);

        // Update the lollipop chart whenever the metric changes
        updateOtherChart([]);

        // Update the heading text
        let metricName = '';
        switch (selectedMetric) {
            case 'income':
                metricName = 'Income Return';
                break;
            case 'growth':
                metricName = 'Capital Growth';
                break;
            case 'total':
                metricName = 'Total Return';
                break;
            default:
                metricName = '';
        }
        cumulativeReturnsHeading.textContent = metricName;
    });
});

// Global data variables
let lollipopData = [];
let lollipopDataFiltered = [];
let xScaleBar, yScaleBar;
let brush;

Promise.all([d3.csv("data/returns.csv"), // bar chart data
    d3.csv("data/sector-market-returns-index.csv") // lollipop chart data
]).then(function (datasets) {
    const barData = datasets[0];
    lollipopData = datasets[1];

    // Process bar chart data
    barData.forEach(function (d) {
        d.income = +d['income'].replace(/,/g, '');
        d.growth = +d['growth'].replace(/,/g, '');
        d.total = +d['total'].replace(/,/g, '');
        d.year = monthToQuarter(d.year);
        console.log("bar - year:", d.year);
    });

    // Process lollipop chart data
    lollipopData.forEach(d => {
        d.income = +d['income'].replace(/,/g, '');
        d.growth = +d['growth'].replace(/,/g, '');
        d.total = +d['total'].replace(/,/g, '');
        d.year = monthToQuarter(d.year);
        d.segment = d['segment'];
        console.log("lollipop - year:", d.year);
    });

    // Check if the click occurred outside the svgbar element
    d3.select('body').on('click', function (event) {
        if (!svgBar.node().contains(event.target)) {
            resetGraph();
        }
    });

    // Initialize the charts
    initBarChart(barData);
    updateOtherChart([]);

}).catch(error => {
    console.error("Error loading data:", error);
});


// Append tooltip div to the body
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Function to initialize the bar chart
function initBarChart(data) {

    // X-axis scale
    var xDomain = Array.from(new Set(data.map(function (d) {
        return d.year;
    }))).sort();

    xScaleBar = d3.scaleBand()
        .range([0, widthBar])
        .domain(xDomain)
        .padding(0.2);

    svgBar.append("g")
        .attr("transform", `translate(0, ${heightBar + 30})`)
        .call(d3.axisBottom(xScaleBar)
            .tickFormat(function (d) {
                // Display the year only for the first quarter of each year
                return d.includes("Q3") ? d.split(" ")[0] : "";
            }))
        .selectAll("text")
        .attr("dx", "-.80em")
        .attr("dy", "1.5em")
        .attr("transform", "rotate(0)")
        .attr("fill", "var(--color-text)")
        .attr("font-size", "10px");

    // Y-axis scale
    var yMax = d3.max(data, function (d) {
        return Math.max(d.income + d.growth, d.total);
    });
    var yMin = d3.min(data, function (d) {
        return Math.min(d.income + d.growth, d.total);
    });

    yScaleBar = d3.scaleLinear()
        .domain([-0.04, yMax])
        .range([heightBar, 0]);

    svgBar.append("g")
        .call(d3.axisLeft(yScaleBar).tickFormat(d3.format(".0%")))
        .selectAll("text")
        .attr("fill", "var(--color-text)")
        .attr("font-size", "10px");

    // Bars for income returns
    svgBar.selectAll(".bar-income")
        .data(data)
        .join("rect")
        .attr("class", "bar-income")
        .attr("x", d => xScaleBar(d.year))
        .attr("y", d => yScaleBar(Math.max(0, d.income)))
        .attr("width", xScaleBar.bandwidth())
        .attr("height", d => Math.abs(yScaleBar(d.income) - yScaleBar(0)))
        .attr("fill", "var(--color1)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(300)
                .style("opacity", .9);
            tooltip.html("<strong>Income Returns:</strong> " + d3.format(".1%")(d.income) + "<br/>" + d.year)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY) + "px")
                .style("background", "var(--color1)")
                .style("color", "var(--color-text)");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(600)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });

    // Bars for capital growth
    svgBar.selectAll(".bar-growth")
        .data(data)
        .join("rect")
        .attr("class", "bar-growth")
        .attr("x", d => xScaleBar(d.year))
        .attr("y", d => yScaleBar(Math.max(0, d.income + d.growth)))
        .attr("width", xScaleBar.bandwidth())
        .attr("height", d => Math.abs(yScaleBar(d.growth) - yScaleBar(0)))
        .attr("fill", "var(--color2)")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(300)
                .style("opacity", .9);
            tooltip.html("<strong>Capital Growth:</strong> " + d3.format(".1%")(d.growth) + "<br/>" + d.year)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY) + "px")
                .style("background", "var(--color2)")
                .style("color", "var(--color-text)");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(600)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });

    // Line-generator for total returns
    var line = d3.line()
        .x(d => xScaleBar(d.year) + xScaleBar.bandwidth() / 2)
        .y(d => yScaleBar(d.total));

    // Append the path for line chart
    var path = svgBar.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "var(--color4)")
        .attr("stroke-width", 2.5)
        .attr("d", line);

// Calculate the total length of the path
    var totalLength = path.node().getTotalLength();

// Set up the starting position of the line (fully hidden)
    path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(6000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

// Append markers at each data point on the line
    svgBar.selectAll(".dot")
        .data(data)
        .enter().append("circle") // Creates a circle for each data point
        .attr("class", "dot")
        .attr("cx", function (d) {
            return xScaleBar(d.year) + xScaleBar.bandwidth() / 2;
        })
        .attr("cy", d => yScaleBar(d.total))
        .attr("r", 2.5)
        .attr("fill", "var(--color3)")
        .attr("stroke", "var(--color-text)")
        .attr("stroke-width", 1)
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html("<strong>Total Returns:</strong> " + d3.format(".1%")(d.total) + "<br/>" + d.year)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY) + "px")
                .style("background", "var(--color4)")
                .style("color", "black");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(600)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });

    // Legend
    var legend = svgBar.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .attr("transform", `translate(0,${heightBar - marginBar.bottom})`)
        .selectAll("g")
        .data(["Income Returns", "Capital Growth", "Total Returns"])
        .enter().append("g")
        .attr("transform", (d, i) => `translate(${widthBar - marginBar.right + i * marginBar.bottom}, 0)`)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            // Use the clicked legend item data 'd' to highlight the chart element
            highlightChartElement(d);
        });

    legend.filter(d => d !== "Total Returns")
        .append("rect")
        .attr("x", marginBar.left * 11.2 - widthBar)
        .attr("y", marginBar.bottom * 4.18 - heightBar)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", (d, i) => ["var(--color1)", "var(--color2)"][["Income Returns", "Capital Growth"].indexOf(d)]);

    // Capital Growth (Line with Marker)
    legend.filter(d => d === "Total Returns")
        .each(function () {
            d3.select(this).append("line")
                .attr("x1", marginBar.left * 11.1 - widthBar)
                .attr("x2", marginBar.left * 11.8 - widthBar)
                .attr("y1", marginBar.bottom * 4.24 - heightBar)
                .attr("y2", marginBar.bottom * 4.24 - heightBar)
                .attr("stroke", "var(--color4)")
                .attr("stroke-width", 4);

            d3.select(this).append("circle")
                .attr("cx", marginBar.left * 11.45 - widthBar)
                .attr("cy", marginBar.bottom * 4.24 - heightBar)
                .attr("r", 2.5)
                .attr("fill", "var(--color3)")
                .attr("stroke", "var(--color-text)");
        });

    legend.append("text")
        .attr("x", marginBar.left * 11 - widthBar)
        .attr("y", marginBar.bottom * 4.25 - heightBar)
        .attr("dy", "0.32em")
        .text(d => d)
        .style("fill", "var(--color-text)");

    // Brush setup
    var brush = d3.brushX()
        .extent([[0, 0], [widthBar, heightBar]])
        .on("end", brushended);

    svgBar.append("g")
        .attr("class", "brush")
        .call(brush);
};

// Brush event handler
function brushended(event) {
    if (!event.selection) {
        console.log("No selection, resetting graph");
        resetGraph(); // Reset if no selection
        return;
    }

    // Get the selected range
    var selectedRange = event.selection.map(d => invertScaleBand(xScaleBar, d));
    console.log("Selected Range:", selectedRange);

    // Process the selected range (update lollipop chart)
    updateOtherChart(selectedRange);
}

function invertScaleBand(scale, value) {
    let eachBand = scale.step();
    let index = Math.floor((value / eachBand));
    return scale.domain()[index];
}

// Interactive legend
function highlightChartElement(elementType) {
    console.log("Clicked element type:", elementType);
    svgBar.selectAll('.bar-income, .bar-growth, .line, .dot')
        .style('opacity', 1);

    // Dim the elements that are not selected
    if (elementType !== 'Income Returns') {
        svgBar.selectAll('.bar-income').style('opacity', 0.2);
    }
    if (elementType !== 'Capital Growth') {
        svgBar.selectAll('.bar-growth').style('opacity', 0.2);
    }
    if (elementType !== 'Total Returns') {
        svgBar.selectAll('.line').style('opacity', 0.2);
        svgBar.selectAll('.dot').style('opacity', 0.2);
    }
}

// Function to reset the graph
function resetGraph() {
    console.log("resetGraph function called");
    svgBar.selectAll('.bar-income, .bar-growth, .line, .dot')
        .style('opacity', 1);

    // Check if brush is defined before trying to use it
    if (brush) {
        svgBar.select(".brush").call(brush.move, null);
    }
}


// Function to update lollipop chart based on brush selection
function updateOtherChart(selectedRange) {
    let startYear, endYear;

    console.log("lollipopData:", lollipopData);
// Check if a range is selected (i.e. brush is applied on stacked bar chart)
    if (!selectedRange || selectedRange.length === 0) {
        // No brush selection, use the last two distinct quarters directly
        if (lollipopData.length >= 2) {
            let distinctQuarters = [...new Set(lollipopData.map(d => d.year))];

            if (distinctQuarters.length >= 2) {
                endYear = distinctQuarters[distinctQuarters.length - 1]; // Most recent quarter
                startYear = distinctQuarters[distinctQuarters.length - 2]; // Second-to-last quarter
            } else {
                console.error("Insufficient distinct quarters in lollipopData.");
                return;
            }
        } else {
            console.error("Insufficient data for lollipop chart.");
            return;
        }
    } else {
        // Use the selected range
        startYear = selectedRange[0];
        endYear = selectedRange[1];
    }

    console.log("startYear:", startYear, "endYear:", endYear);

    // Calculate the number of quarters in the brush selected range
    const quarterCount = calculateQuartersCount(startYear, endYear);

    // Update the heading to include the quarters count
    const headingText = `${startYear} - ${endYear} (${quarterCount - 1}-Quarter)`;
    document.getElementById('lollipop-heading').textContent = headingText;

    // Group data by segment
    let groupedData = {};
    lollipopData.forEach(d => {
        if (!groupedData[d.segment]) {
            groupedData[d.segment] = [];
        }
        groupedData[d.segment].push(d);
    });

    // Calculate the new values for each segment
    let updatedData = [];
    for (let segment in groupedData) {
        let segmentData = groupedData[segment];
        let startData = segmentData.find(d => d.year === startYear);
        let endData = segmentData.find(d => d.year === endYear);

        if (startData && endData) {
            // Calculate the annualized value
            let newValue = Math.pow((endData[selectedMetric] / startData[selectedMetric]), (4 / (quarterCount - 1))) - 1;
            // let newValue = (endData[selectedMetric] / startData[selectedMetric]) - 1;
            updatedData.push({...endData, newValue: newValue});
        }
    }

    // Define the sectors and markets to be sorted
    const sectorsToSort = ["Residential", "Retail", "Industrial", "Office"];
    const marketsToSort = ["Calgary", "Toronto", "Vancouver", "Edmonton", "Ottawa", "Montreal"];

    // Extract the 'All' segment
    let allSegment = updatedData.filter(d => d.segment === "All");

    // Separate the segments to be sorted from the rest
    let sortedSectors = updatedData.filter(d => sectorsToSort.includes(d.segment));
    let sortedMarkets = updatedData.filter(d => marketsToSort.includes(d.segment));
    let otherSegments = updatedData.filter(d => !sectorsToSort.includes(d.segment) && !marketsToSort.includes(d.segment) && d.segment !== "All");

    // Sort the selected sectors and markets in descending order of newValue
    sortedSectors.sort((a, b) => b.newValue - a.newValue);
    sortedMarkets.sort((a, b) => b.newValue - a.newValue);

    // Define spacer objects with labels
    const sectorSpacer = {segment: 'Sectors', newValue: 0};
    const marketSpacer = {segment: 'Markets', newValue: 0};

// Modify the lollipopDataFiltered construction
    lollipopDataFiltered = allSegment
        .concat([sectorSpacer]) // Spacer with 'Sectors' label
        .concat(sortedSectors)
        .concat([marketSpacer]) // Spacer with 'Markets' label
        .concat(sortedMarkets)
        .concat(otherSegments);

    // Update the lollipop chart with these new values
    updateLollipopChart(lollipopDataFiltered);
}

function calculateQuartersCount(startQuarter, endQuarter) {
    const start = startQuarter.split(" ");
    const end = endQuarter.split(" ");
    const quarterToNumber = {'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4};

    const startYear = parseInt(start[0]);
    const endYear = parseInt(end[0]);
    const startQ = quarterToNumber[start[1]];
    const endQ = quarterToNumber[end[1]];

    return ((endYear - startYear) * 4) + (endQ - startQ + 1);
}

// Function to update the lollipop chart
function updateLollipopChart(data) {

    console.log("lollipop data:", data);
    // Clear existing elements from the SVG
    svgLollipop.selectAll("*").remove();

    // Scales for the lollipop chart
    const minValue = d3.min(data, d => d.newValue);
    const maxValue = d3.max(data, d => d.newValue);
    console.log("minValue:", minValue, "maxValue:", maxValue);

    // X and Y scales
    const xScaleLollipop = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([0, widthLollipop]);

    const yScaleLollipop = d3.scaleBand()
        .domain(data.map(d => d.segment))
        .range([0, heightLollipop])
        .padding(0.75);

    // Append X and Y axes
    svgLollipop.append("g")
        .attr("transform", `translate(0, ${heightLollipop})`)
        .call(d3.axisBottom(xScaleLollipop))
        .attr("opacity", 0);

    svgLollipop.append("g")
        .call(d3.axisLeft(yScaleLollipop)
            .tickSize(0)
            .tickPadding(10))
        .style("font-size", "12px")
        .selectAll("text")
        .style("text-anchor", "start")
        .attr("dx", "-5em")
        .each(function (d) {
            // Apply 'none' color to 'Sectors' and 'Markets' text
            if (d === 'Sectors' || d === 'Markets') {
                d3.select(this).style("fill", "none");
            } else {
                d3.select(this).style("fill", "var(--color-text)");
            }
        });

    // Draw the lines (sticks) of the lollipop chart
    let lines = svgLollipop.selectAll(".line")
        .data(data);

    lines.enter()
        .append("line")
        .attr("class", "line")
        .style("display", d => d.segment === '' ? 'none' : null) // Hide lines for spacer segments
        .attr("x1", d => d.newValue >= 0 ? xScaleLollipop(0) : xScaleLollipop(d.newValue)) // Starting point for the line
        .attr("x2", d => d.newValue >= 0 ? xScaleLollipop(d.newValue) : xScaleLollipop(0)) // Ending point for the line
        .attr("y1", d => yScaleLollipop(d.segment))
        .attr("y2", d => yScaleLollipop(d.segment))
        .attr("stroke", function (d) {
            if (d.newValue < 0) {
                return "var(--color3)";
            }
            switch (d.segment) {
                case 'Residential':
                case 'Industrial':
                case 'Office':
                case 'Retail':
                    return "var(--color1)";
                case 'Calgary':
                case 'Edmonton':
                case 'Montreal':
                case 'Ottawa':
                case 'Toronto':
                case 'Vancouver':
                    return "var(--color4)";
                case 'All':
                    return "var(--color2)";
            }
        })
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", "12px")
        .on("mouseover", function (event, d) {
            let color;
            if (d.newValue < 0) {
                color = "var(--color3)";
            } else {
                color = (d.segment === 'Residential' || d.segment === 'Industrial' || d.segment === 'Office' || d.segment === 'Retail') ? "var(--color5)" : (d.segment === 'Calgary' || d.segment === 'Edmonton' || d.segment === 'Montreal' || d.segment === 'Ottawa' || d.segment === 'Toronto' || d.segment === 'Vancouver') ? "var(--color4)" : (d.segment === 'All') ? "var(--color2)" : "var(--color1)"; // Default color
            }
            tooltip.transition()
                .duration(100)
                .style("opacity", 0.8)
                .style("color", "var(--color-text)");
            tooltip.html(d.segment + "<br/>" + "% Change: " + d3.format(".1%")(d.newValue))
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY) + "px")
                .style("background", color);
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });

// Draw the circles (heads) of the lollipop chart
    let circles = svgLollipop.selectAll(".circle")
        .data(data);

    circles.enter()
        .append("circle")
        .attr("class", "circle")
        .style("display", d => d.segment === 'Sectors' || d.segment === 'Markets' ? 'none' : null) // Hide circles for spacer segments
        .attr("r", 10)
        .attr("cx", d => xScaleLollipop(d.newValue))
        .attr("cy", d => yScaleLollipop(d.segment))
        .style("fill", function (d) {
            switch (selectedMetric) {
                case 'income':
                    return "var(--color1)";
                case 'total':
                    return "var(--color4)";
                case 'growth':
                    return "var(--color2)";
                default:
                    return "var(--color1)";
            }
        })
        .attr("opacity", 1)
        .on("mouseover", function (event, d) {
            let color;
            if (d.newValue < 0) {
                color = "var(--color3)";
            } else {
                color = (d.segment === 'Residential' || d.segment === 'Industrial' || d.segment === 'Office' || d.segment === 'Retail') ? "var(--color5)" : (d.segment === 'Calgary' || d.segment === 'Edmonton' || d.segment === 'Montreal' || d.segment === 'Ottawa' || d.segment === 'Toronto' || d.segment === 'Vancouver') ? "var(--color4)" : (d.segment === 'All') ? "var(--color2)" : "var(--color1)"; // Default color
            }
            tooltip.transition()
                .duration(100)
                .style("opacity", 0.8)
                .style("color", "var(--color-text)");
            tooltip.html(d.segment + "<br/>" + "% Change: " + d3.format(".1%")(d.newValue))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("background", color);
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });
    circles.exit().remove();

    // Clear existing legend
    svgLollipop.selectAll(".lollipop-legend").remove();

// Legend items
    const legendItems = [{color: "var(--color2)", text: "All"}, {color: "var(--color1)", text: "Sectors"}, {
        color: "var(--color4)", text: "Markets"
    }, {color: "var(--color3)", text: "Negative Return"},];

// Fixed width for each legend item
    const legendItemWidth = 70;

// Legend at the top
    const legend = svgLollipop.append("g")
        .attr("class", "lollipop-legend")
        .attr("transform", `translate(0, ${heightLollipop - marginBar.bottom * 3.25})`);

// Create legend items
    legend.selectAll("legend-item")
        .data(legendItems)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * legendItemWidth}, 0)`) // Fixed width to position items
        .each(function (d) {
            const g = d3.select(this);
            g.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", d.color)
                .attr("opacity", "0.6");
            g.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .text(d.text)
                .style("font-size", "10px")
                .style("fill", "var(--color-text)");
        });

// Add labels to the lollipop chart
    let labels = svgLollipop.selectAll(".label")
        .data(data);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .style("display", d => d.segment === 'Sectors' || d.segment === 'Markets' ? 'none' : null) // Hide labels for spacer segments
        .attr("x", d => {
            // Position the label between the y-axis and the lollipop
            if (d.newValue >= 0) {
                return xScaleLollipop(d.newValue) + 45;
            } else {
                return xScaleLollipop(d.newValue) + 30;
            }
        })
        .attr("y", d => yScaleLollipop(d.segment) + yScaleLollipop.bandwidth() / 2)
        .attr("text-anchor", d => d.newValue >= 0 ? "end" : "start") // Adjust text anchor based on value
        .attr("font-size", "10px")
        .style("fill", "var(--color-text)")
        .each(function (d) {
            if (d.segment !== '') {
                var label = d3.select(this);
                label.append("tspan")
                    .attr("font-weight", "bold")
                    .text(" " + d3.format(".1%")(d.newValue));
            }
        });

    labels.exit().remove();

// Labels for spacers
    svgLollipop.selectAll(".spacer-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "spacer-label")
        .style("display", d => (d.segment === 'Sectors' || d.segment === 'Markets') ? null : 'none')
        .attr("x", widthLollipop / 2)
        .attr("y", d => yScaleLollipop(d.segment) + yScaleLollipop.bandwidth() / 2 + marginLollipop.top / 2 - 3)
        .style("text-anchor", "end")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("fill", "wheat")
        .text(d => d.segment);
}
