// SVG Size
let marginBubble = {top: 40, right: 60, bottom: 60, left: 60};
let widthBubble = 860 - marginBubble.left - marginBubble.right;
let heightBubble = 425 - marginBubble.top - marginBubble.bottom;

// SVG container with id "bubble-area"
const svgBubble = d3.select("div#bubble-area").append("svg")
    .attr("id", "bubble-area")
    .attr("width", widthBubble + marginBubble.left + marginBubble.right)
    .attr("height", heightBubble + marginBubble.top + marginBubble.bottom)
    .append("g")
    .attr("transform", "translate(" + marginBubble.left + "," + marginBubble.top + ")");

console.log("svg", svgBubble);

/**************************************************************/
/******** Global Variables ************************************/
/**************************************************************/

let currentYearIndex = 0;
const years = Array.from({length: 24}, (_, i) => 2000 + i); // Years from 2001 to 2023
let sortMetric = "total"; // Initialize sortMetric with a default value in the table
let flatData; // To store the flattened data


/**************************************************************/
/******** Dropdown for data selection *************************/
/**************************************************************/

const dataSelection = d3.select("#dataSelection").on("change", function () {
    console.log("Selected dataset:", this.value);
    loadData(this.value);
});

dataSelection.selectAll("option")
    .data(["Market Data", "Sector Data"])
    .enter().append("option")
    .text(d => d)
    .attr("value", d => d === "Market Data" ? "data/market.csv" : "data/sector.csv");


/**************************************************************/
/******** Animation Buttons ***********************************/
/**************************************************************/
// Play button for autoplay
const playButton = d3.select(".btn1").attr("id", "playPauseButton")

// Back button to show the previous year
const backButton = d3.select(".btn2").attr("id", "backButton").style("display", "none")

// Button to show the next year
const forwardButton = d3.select(".btn3").attr("id", "forwardButton").style("display", "none")

let isPlaying = false;
let interval;


/**************************************************************/
/******** Loading & Wrangling Two Datasets ********************/

/**************************************************************/
async function loadData(selectedDataset) {
    console.log("Loading dataset:", selectedDataset);

    // Sub-heading text based on the selected dataset
    let headingText = selectedDataset === "market.csv" ? "Markets" : "Sectors";
    d3.select("#dynamic-heading").text("4-Quarter Trailing Capital Value (Annualized, 2001 - 2023) for " + headingText)

    // Clear existing SVG elements
    svgBubble.selectAll("*").remove();

    // Reset global variables if needed
    currentYearIndex = 0; // Reset the current year index

    const data = await d3.csv(`data/${selectedDataset}`);
    console.log("loaded data", data)

    // Convert the loaded data to a nested JSON structure
    const jsonData = {};

    data.forEach(row => {
        const year = +row.year;
        const segment = row.segment;
        const total = +row.total;
        const yield = +row.yield;
        const income = +row.income;
        const capitalvalue = +row.capitalvalue.replace(/,/g, '');

        // Check if the year is already a key in the object
        if (!jsonData[year]) {
            jsonData[year] = {};
        }

        // Add the segment data to the object
        jsonData[year][segment] = {
            total: total, yield: yield, income: income, capitalvalue: capitalvalue
        };
    });

    // Flatten the nested structure into an array of objects
    flatData = Object.keys(jsonData).reduce((d, year) => {
        const segments = Object.keys(jsonData[year]);
        segments.forEach(segment => {
            d.push({
                year: +year,
                segment: segment,
                total: jsonData[year][segment].total,
                yield: jsonData[year][segment].yield,
                income: jsonData[year][segment].income,
                capitalvalue: jsonData[year][segment].capitalvalue
            });
        });
        return d;
    }, []);

    console.log(flatData)
    const percentFormatter = d3.format("0.0%");


    // x, y, radius scales
    var xScale = d3.scaleLinear()
        .domain([0.06, 0.17])
        .range([0, widthBubble]);

    var yScale = d3.scaleLinear()
        .domain([0, 0.12])
        .range([heightBubble, 0]);

    var radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(flatData, d => d.capitalvalue)])
        .range([10, 40]);

    // Color scale for sectors
    var colorScale = d3.scaleOrdinal()
        .range(["var(--color3)", "var(--color4)", "var(--color1)", "var(--color2)", "var(--color5)", "var(--color6)"]);

    // Axes
    var xAxis = d3.axisBottom().scale(xScale)
        .ticks(8)
        .tickFormat(d3.format(".0%"))
        .tickSizeInner(-heightBubble)
        .tickSizeOuter(heightBubble)
        .tickPadding(10);

    var yAxis = d3.axisLeft().scale(yScale)
        .ticks(7)
        .tickFormat(d3.format(".0%"))
        .tickSizeInner(-widthBubble)
        .tickSizeOuter(widthBubble)
        .tickPadding(10);

// Drawing x-axis
    svgBubble.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + heightBubble + ")")
        .call(xAxis)
        .selectAll("text")
        .style("fill", "var(--color-text)")
        .style("font-size", "13px");

// Drawing y-axis
    svgBubble.append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis)
        .selectAll("text")
        .style("fill", "var(--color-text)")
        .style("font-size", "13px");

// Adding x-axis line
    svgBubble.append("line")
        .style("stroke", "var(--color-text)")
        .style("stroke-width", "0.5")
        .attr("x1", 0)
        .attr("y1", heightBubble)
        .attr("x2", widthBubble)
        .attr("y2", heightBubble);

// Adding y-axis line
    svgBubble.append("line")
        .style("stroke", "var(--color-text)")
        .style("stroke-width", "0.5")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", heightBubble);

    // X axis labels
    svgBubble.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (widthBubble/2) + "," + (heightBubble * 1.13) + ")")
        .text("Total Return (Since Inception)")
        .style("fill", "var(--color-text)")
        .style("font-size", "15px");

    // Y axis labels
    svgBubble.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - marginBubble.left)
        .attr("x", 100 - marginBubble.height)
        .attr("dx", "-9em")
        .attr("dy", "1em")
        .text("Income Return")
        .style("fill", "var(--color-text)")
        .style("font-size", "15px");

    /**************************************************************/
    /******** Functions for Play, Pause, Back and Forward *********/
    /**************************************************************/

    // Play button for starting and pausing the animation
    playButton.on("click", function () {
        isPlaying = !isPlaying;
        const button = d3.select(this);

        if (isPlaying) {
            button.text("Pause");
            forwardButton.style("display", "none");  // Hide the button when playing
            d3.select("#forwardButtonText").style("display", "none"); // Hide Forward button text
            backButton.style("display", "none");  // Hide the button when playing
            d3.select("#backButtonText").style("display", "none"); // Hide Back button text
            playAnimation(flatData, xScale, yScale, radiusScale, colorScale);
        } else {
            button.text("Resume");
            clearInterval(interval);
            forwardButton.style("display", "block");  // Show the button when paused
            d3.select("#forwardButtonText").style("display", "block"); // Show Forward button text
            backButton.style("display", "block");  // Show the button when paused
            d3.select("#backButtonText").style("display", "block"); // Show Back button text
        }
    });

    // Forward button for viewing the next year
    forwardButton.on("click", function () {
        if (currentYearIndex < years.length - 1) { // Ensure it doesn't go beyond 2023
            currentYearIndex++;
        } else {
            currentYearIndex = years.length - 1; // Stop at 2023
        }
        forwardButton.text(years[currentYearIndex]);
        displayCirclesForYear(flatData, currentYearIndex, xScale, yScale, radiusScale, colorScale, sortMetric);
        d3.select("#forwardButtonText").style("display", "block"); // Ensure Forward button text is shown
    });

    // Back button for viewing the previous year
    backButton.on("click", function () {
        if (currentYearIndex > 1) { // To prevent going below 2001
            currentYearIndex--;
        } else {
            currentYearIndex = 1; // Set to 1 to stop at 2001
        }
        backButton.text(years[currentYearIndex]);
        displayCirclesForYear(flatData, currentYearIndex, xScale, yScale, radiusScale, colorScale, sortMetric);
        d3.select("#backButtonText").style("display", "block"); // Ensure Back button text is shown

    });

    displayCirclesForYear(flatData, years.length - 1, xScale, yScale, radiusScale, colorScale, sortMetric);
}


/**************************************************************/
/********************** Animation Function ********************/
/**************************************************************/
function playAnimation(data, xScale, yScale, radiusScale, colorScale) {
    let autoplaySpeed = 500;

    function step() {
        // Move to the next year
        currentYearIndex = (currentYearIndex + 1) % years.length;

        // Check if the current year is the last year in the animation
        if (currentYearIndex === 0) {
            clearInterval(interval);
            d3.select("#playPauseButton").text("Play Again");
            isPlaying = false;
            backButton.style("display", "none"); // Ensure the back button is hidden
            // Display the last year's data before stopping
            displayCirclesForYear(data, years.length - 1, xScale, yScale, radiusScale, colorScale, sortMetric);
            return;
        }

        backButton.style("display", "none"); // Hide the back button during autoplay
        displayCirclesForYear(data, currentYearIndex, xScale, yScale, radiusScale, colorScale, sortMetric);
        d3.select("#forwardButton").text(years[currentYearIndex]);
    }

    // Start autoplay
    interval = setInterval(step, autoplaySpeed);
}


/**************************************************************/
/********************** Bubble Chart Function *****************/
/**************************************************************/
function displayCirclesForYear(data, yearIndex, xScale, yScale, radiusScale, colorScale, sortMetric) {

    // Display circles for the current year
    const currentYear = years[yearIndex];
    const circlesForYear = data.filter(d => d.year === currentYear);

    /**************************************************************/
    /*********************** Table Sort and Update* ***************/
    /**************************************************************/

    // Sort circlesForYear array based on the selected metric in descending order for the table
    if (sortMetric === "total") {
        circlesForYear.sort((a, b) => b.total - a.total);
    } else if (sortMetric === "income") {
        circlesForYear.sort((a, b) => b.income - a.income);
    } else if (sortMetric === "capitalvalue") {
        circlesForYear.sort((a, b) => b.capitalvalue - a.capitalvalue);
    }

    // Update the table box content
    const tableBox = d3.select("#table-box");
    let tableContent = '<table>';
    tableContent += '<tr><th></th><th style="border-bottom: 0.1px solid var(--color-text);">Total Return</th><th style="border-bottom: 0.1px solid var(--color-text);">' +
        'Income Return</th><th style="border-bottom: 0.1px solid var(--color-text);">Capital Value (C$)</th></tr>';

    circlesForYear.forEach(d => {
        const segmentColor = colorScale(d.segment);
        tableContent += `<tr style="color:${segmentColor};">
                        <td style="text-align: left;"><strong>${d.segment}</strong></td>
                        <td>${(d.total * 100).toFixed(0)}%</td>
                        <td>${(d.income * 100).toFixed(0)}%</td>
                        <td>${(d.capitalvalue / 1e9).toFixed(0)}B</td>
                     </tr>`;
    });

    // Add the year as the last row
    tableContent += `<tr><td></td><td colspan="3" style="text-align: end;"><h1 style="color: var(--color-text)">${currentYear}</h1></td></tr>`;

    tableContent += '</table>';
    tableBox.html(tableContent);

    /**************************************************************/
    /*********************** Pop-up Commentary Boxes **************/
    /**************************************************************/

    // Add or remove the commentary based on the year
    const commentaryBox1 = d3.select("#commentary-box1"); // Ensure you have this element in your HTML
    if (currentYear === 2001 || currentYear === 2002) {
        commentaryBox1.html("<p><strong>Dot-com Bubble: Hardest-hit Markets</strong> <br>Ottawa and Toronto hit harder by high-tech woes with layoffs and hiring freezes in ICT companies.</p>");
        commentaryBox1.style("display", "block");
    } else {
        commentaryBox1.style("display", "none");
    }

    // Add or remove the commentary based on the year
    const commentaryBox2 = d3.select("#commentary-box2"); // Ensure you have this element in your HTML
    if (currentYear === 2008 || currentYear === 2009) {
        commentaryBox2.html("<p><strong>Global Financial Crisis: Housing Bubble</strong> <br>Canada experienced very little drawdown in values and returns were quite strong</p>");
        commentaryBox2.style("display", "block");
    } else {
        commentaryBox2.style("display", "none");
    }

    // Add or remove the commentary based on the year
    const commentaryBox3 = d3.select("#commentary-box3"); // Ensure you have this element in your HTML
    if (currentYear === 2020 || currentYear === 2021) {
        commentaryBox3.html("<p><strong>Global Pandemic: COVID-19</strong><br>Widespread lockdowns and layoffs followed by a rapid V-shaped recovery in market values</p>");
        commentaryBox3.style("display", "block");
    } else {
        commentaryBox3.style("display", "none");
    }

    // Add or remove the commentary based on the year
    const commentaryBox4 = d3.select("#commentary-box4"); // Ensure you have this element in your HTML
    if (currentYear === 2022 || currentYear === 2023) {
        commentaryBox4.html("<p><strong>Post-COVID: High Inflation & Mortgage Rates:</strong><br>Slowdown in real estate investments with mild recession expected in Q2 2024</p>");
        commentaryBox4.style("display", "block");
    } else {
        commentaryBox4.style("display", "none");
    }

    /**************************************************************/
    /*********************** Bubble Chart *************************/
    /**************************************************************/

    // Remove existing circles, labels and tooltip
    svgBubble.selectAll("circle").remove();
    svgBubble.selectAll(".segment-label").remove();
    svgBubble.selectAll(".callout-line").remove();
    svgBubble.selectAll(".label-bg").remove();
    d3.select(".tooltip").remove();

    //  Tooltip
    const tooltipBubble = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("rx", 5)
        .attr("ry", 5)
        .style("opacity", 0);

    function getTooltipBackgroundColor(segment) {
        return colorScale(segment);
    }

    // Update circles for the current year
    let circlesBubble = svgBubble.selectAll("circle")
        .data(circlesForYear, d => d.segment); // Key function for object constancy

    // Append circles for the current year
    circlesBubble
        .enter().append("circle")
        .attr("cx", d => xScale(d.total))
        .attr("cy", d => yScale(d.income))
        .attr("r", d => radiusScale(d.capitalvalue * 2))
        .style("stroke", "grey")
        .style("fill", d => colorScale(d.segment))
        .style("stroke-width", "0.5")
        .style("opacity", 0.85)
        .on("mouseover", function (event, d) {
            tooltipBubble.transition()
                .duration(200)
                .style("opacity", 0.95)
                .style("background-color", getTooltipBackgroundColor(d.segment));
            tooltipBubble.html(`<h4>${d.segment}</h4><br><h5><strong>Total Returns:</strong></h5> ${(d.total * 100).toFixed(1) + "%"}<br><h5><strong>Income Returns:</strong></h5> ${(d.income * 100).toFixed(1) + "%"}<br><h5><strong>Capital Value:</strong></h5> ${(d.capitalvalue / 1e9).toFixed(1) + "B"}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltipBubble.transition()
                .duration(200)
                .style("opacity", 0)
                .style("left", 0)
                .style("top", 0);
        });

    // Create and update callout labels
    circlesForYear.forEach((d, i) => {
        // Calculate label and line positions
        const xCircle = xScale(d.total);
        const yCircle = yScale(d.income);
        const offset = radiusScale(d.capitalvalue * 2)
        const xLabel = xCircle + (i % 2 === 0 ? -offset : offset); // Alternate positions
        const yLabel = yCircle + (i % 2 === 0 ? -offset : offset);

        // Append callout line
        svgBubble.append("line")
            .attr("class", "callout-line")
            .attr("x1", xCircle)
            .attr("y1", yCircle)
            .attr("x2", xLabel)
            .attr("y2", yLabel)
            // .style("stroke", 'none')
            .style("stroke", colorScale(d.segment))
            .style("stroke-width", "0.25px");


        // Append callout label
        let labelBubble = svgBubble.append("text")
            .attr("class", "segment-label")
            .attr("x", xLabel)
            .attr("y", yLabel)
            .attr("dy", ".30em")
            .text(d.segment)
            .style("text-anchor", i % 2 === 0 ? "end" : "start")
            .style("fill", colorScale(d.segment))
            .style("font-size", "11px");

        // Get dimensions of the text for the background rectangle
        const bbox = labelBubble.node().getBBox();

        // Append background rect (label)
        svgBubble.insert("rect", "text.segment-label")
            .attr("class", "label-bg")
            .attr("x", bbox.x - 2)
            .attr("y", bbox.y - 2)
            .attr("width", bbox.width + 4)
            .attr("height", bbox.height + 4)
            .attr("fill", "var(--text-background)")
            .attr("rx", 5)
            .attr("ry", 5);
    });

    /**************************************************************/
    /*********************** Auto-play Check **********************/
    /**************************************************************/

// Check if autoplay is enabled and pause at the end of the animation
    if (!isPlaying && yearIndex === years.length - 1) {
        clearInterval(interval);
        return;
    }
    // Move to the next year if autoplay is enabled
    if (isPlaying) {
        yearIndex = (yearIndex) % years.length;
        d3.select("#forwardButton").text(years[yearIndex]);
    }
}

/**************************************************************/
/************** Table Sort Selection Function *****************/
/**************************************************************/

// Listen to changes in the sorting dropdown for table updates
d3.select("#sortSelection").on("change", function () {
    sortMetric = this.value;
    displayCirclesForYear(flatData, currentYearIndex, xScale, yScale, radiusScale, colorScale, sortMetric);
});

// Load the default dataset when the page first loads
loadData("market.csv");
