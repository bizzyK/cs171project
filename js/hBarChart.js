class hBarChart {

    constructor(_parentElement, _data) {
        this.parentElement = _parentElement;
        this.data = _data;
        // this.eventHandler = _eventHandler;

        this.initVis();
    }

    initVis() {
        let vis = this;

        // Create a new dataset with the market change values
        vis.market_change_data = createHousingData(vis.data);

        // console.log("vis.market_change_data: ", vis.market_change_data);

        vis.margin = { top: 15, right: 25, bottom: 25, left: 50 };

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right,
            vis.height = 190 - vis.margin.top - vis.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleBand()
            .range([0, vis.width]).padding(0.1);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y)
            .tickFormat(d3.format(".0%"))
            .ticks(6);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // // Axis title
        // vis.svg.append("text")
        //     .attr("x", -50)
        //     .attr("y", -8)
        //     .text("Votes");

        // TODO might need to move this down to updatevis later? or maybe it's fine here...
        // Scale the range of the data
        vis.x.domain(vis.market_change_data.map(d => d.category));
        vis.y.domain([0, d3.max(vis.market_change_data, d => d.change)]);

        // Draw the bars
        vis.svg.selectAll(".bar")
            .data(vis.market_change_data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => vis.x(d.category))
            .attr("width", vis.x.bandwidth())
            .attr("y", d => vis.y(d.change))
            .attr("height", d => vis.height - vis.y(d.change));

        // (Filter, aggregate, modify data)
        vis.wrangleData();
    }



    /*
     * Data wrangling
     */

    wrangleData() {
        let vis = this;

        this.displayData = this.data;

        // Update the visualization
        vis.updateVis();
    }



    /*
     * The drawing function - should use the D3 update sequence (enter, update, exit)
     * Function parameters only needed if different kinds of updates are needed
     */

    updateVis() {
        let vis = this;

        // Update y domain
        vis.y.domain([0, d3.max(vis.market_change_data, d => d.change)]);

        // Enter update barcharts
        vis.svg.selectAll(".bar")
            .data(vis.market_change_data)
            .enter().append("rect")
            .merge(vis.svg.selectAll(".bar"))
            .transition()
            .duration(800)
            .attr("class", "bar")
            .attr("x", d => vis.x(d.category))
            .attr("width", vis.x.bandwidth())
            .attr("y", d => vis.y(d.change))
            .attr("height", d => vis.height - vis.y(d.change));


        // Exit barcharts
        vis.svg.selectAll(".bar")
            .data(vis.market_change_data)
            .exit()
            .remove();

        // Call axis functions with the new domain
        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);
    }

    onSelectionChange(selectionStart, selectionEnd) {
        let vis = this;

        // Filter original unfiltered data depending on selected time period (brush)
        vis.filteredData = vis.data.filter(function (d) {
            return d.date >= selectionStart && d.date <= selectionEnd;
        });

        // Create dataset but with new filtered data
        vis.market_change_data = createHousingData(vis.filteredData);
        vis.wrangleData();
}
}