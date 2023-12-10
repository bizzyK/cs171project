/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// Combined Global Variables
let myMap, VectomMap, myNationalVis, myStackedChart;
let macroChart, consumerChart, unemploymentChart, mortgageChart;

// Function to convert date objects to strings or reverse
let dateParser = d3.timeParse("%m/%d/%Y");
let dateFormat = d3.timeFormat("%Y-%m-%d");

let geoDataPath = "data/canada.topo.json";
let populationDataPath = "data/canada_provinces_pop.csv";

let macroTooltipText = {
    macro: "macro filler text",
    consumer: "consumer filler text",
    unemployment: "unemployment filler text",
    mortgage: "mortgage filler text"
};

let promises = [
    d3.csv("data/macro.csv"),
    d3.csv("data/consumer.csv"),
    d3.csv("data/housing.csv"),
    d3.json(geoDataPath),
    d3.csv("data/industrial.csv"),
    d3.csv("data/vacancy.csv"),
    d3.csv("data/rentGrowth.csv"),
    d3.csv(populationDataPath)
];


Promise.all(promises)
    .then(function (data) {
        // Rename the column in the first dataset only
        const renamedData = data.map(function (dataset, index) {
            if (index === 0) {
                return dataset
                    .filter(row => dateFormat(dateParser(row['Date'])) <= '2023-12-01')
                    .map(function (row) {
                    return {
                        date: dateParser(row['Date']),
                        unemployment: +row['Unemployment rate'],
                        gdp_yy_chg: +row['GDP, real, LCU, Y/Y %Chg'],

                    };
                });
            } else if (index === 1) {
                return dataset
                    .filter(row => dateFormat(dateParser(row['Date'])) <= '2023-12-01')
                    .map(function (row) {
                    return {
                        date: dateParser(row['Date']),
                        clothing: +row['Consumer spending, nominal, LCU - Clothing and footwear - Total'],
                        eating_out: +row['Consumer spending, nominal, LCU - Eating out'],
                        food_bev: +row['Consumer spending, nominal, LCU - Food and non-alcoholic beverages - Total'],
                        health_gs: +row['Consumer spending, nominal, LCU - Health goods and services - Total'],
                        household_outdoor: +row['Consumer spending, nominal, LCU - Household and garden tools and equipment'],
                        household_appliances: +row['Consumer spending, nominal, LCU - Household appliances'],
                        household_expenditures: +row['Consumer spending, nominal, LCU - Household furnishings, household equipment and other housing expenditure - Total'],
                        housing_maintenance: +row['Consumer spending, nominal, LCU - Housing maintenance and repairs'],
                        medical_products: +row['Consumer spending, nominal, LCU - Medical products, appliances and equipment'],
                        personal_gs: +row['Consumer spending, nominal, LCU - Personal care goods and services'],
                        rec_cult: +row['Consumer spending, nominal, LCU - Recreational and cultural goods and services - Total'],
                        restaurants_hotels: +row['Consumer spending, nominal, LCU - Restaurants and hotels  - Total'],
                        total_consumer_spending: +row['Consumer spending, nominal, LCU - Total consumer spending'],

                    }
                })
            } else if (index === 2) {
                return dataset
                    .filter(row => dateFormat(dateParser(row['Date'])) <= '2023-12-01')
                    .map(function (row) {
                    return {
                        date: dateParser(row['Date']),
                        sale_price_index: +row['CREA Average Residential Sale Price Index'],
                        mortgage_rates: +row['Interest rate on fixed 5-year mortgages [%]'],
                        housing_market_value: +row['Market value of housing stock, LCU [C$; Millions]'],
                    }
                })

            } else {
                // For other datasets, keep them as they are
                return dataset;
            }
        });

        initMainPage(renamedData);
    })
    .catch(function (err) {
        console.error('Error loading data: ', err);
        // Display an error message to the user, or handle the error as appropriate.
    });

// initMainPage
function initMainPage(dataArray) {

    let macro_data = dataArray[0]
    let consumer_data = dataArray[1]
    let housing_data = dataArray[2]
    let geoData = dataArray[3];
    let industrial = dataArray[4];
    let vacancyData = dataArray[5];
    let rentGrowthData = dataArray[6];

    let colors = getColorDefinitions();

    let macroEventHandler = {
        bind: (eventName, handler) => {
            document.body.addEventListener(eventName, handler);
        },
        trigger: (eventName, extraParameters) => {
            document.body.dispatchEvent(new CustomEvent(eventName, {
                detail: extraParameters
            }));
        }
    }

    //macroChart = new LineChart("macro_vis", macro_data, macroEventHandler)
    macroChart = new LineChart("macro_vis2", macro_data, macroEventHandler, macroTooltipText.macro)
    consumerChart = new cBarChart("consumer_vis", consumer_data, colors, macroTooltipText.consumer)
    unemploymentChart = new AreaChart("unemployment_vis", macro_data, "unemployment", colors, "Unemployment Rate", macroTooltipText.unemployment)
    mortgageChart = new AreaChart("mortgage_vis", housing_data, "mortgage_rates", colors, "Mortgage Rates", macroTooltipText.mortgage)

    macroEventHandler.bind("selectionChanged", function (event) {
        let rangeStart = event.detail[0];
        let rangeEnd = event.detail[1];
        consumerChart.onSelectionChange(rangeStart, rangeEnd);
        unemploymentChart.onSelectionChange(rangeStart, rangeEnd);
        mortgageChart.onSelectionChange(rangeStart, rangeEnd);
    });

    // Initialize my visualizations
    myMap = new CanadaMap("canada", geoData, colors);
    VectomMap = new VectomMapVis('map', populationDataPath, geoDataPath, colors);
    VectomMap.addColorScaleKey();
    myStackedChart = new stackedChart("stacked-chart", vacancyData, rentGrowthData, colors, industrial);
    myNationalVis = new dualChart("national-vis", industrial, colors);
    document.getElementById('resetButton').addEventListener('click', () => {
        VectomMap.resetToCurrentPopulation(); //
    });


    // Attach event listeners to scroll buttons
    const scrollLeftHandler = (event) => {
        event.stopPropagation();
        myNationalVis.scrollLeft();
    };

    const scrollRightHandler = (event) => {
        event.stopPropagation();
        myNationalVis.scrollRight();
    };

    document.getElementById('scroll-left').removeEventListener('click', scrollLeftHandler);
    document.getElementById('scroll-left').addEventListener('click', scrollLeftHandler);

    document.getElementById('scroll-right').removeEventListener('click', scrollRightHandler);
    document.getElementById('scroll-right').addEventListener('click', scrollRightHandler);




    //update dot navigation
    // Initialize an IntersectionObserver for dot navigation
    const dotObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Get the section ID from the observed entry
                const sectionId = entry.target.id;

                // Find the corresponding dot based on the section ID
                const dot = document.querySelector(`.dot[data-section="${sectionId}"]`);

                // Remove the 'active' class from all dots
                document.querySelectorAll('.dot').forEach((dot) => {
                    dot.classList.remove('active');
                });

                // Add the 'active' class to the corresponding dot
                dot.classList.add('active');
            }
        });
    }, {threshold: 0.5}); // Adjust the threshold as needed

// Observe all sections with the 'section' class for dot navigation
    document.querySelectorAll('.section').forEach((section) => {
        dotObserver.observe(section);
    });

// Button for national graph scroll
    function toggleScrollButtons(show) {
        let leftButton = document.getElementById('scroll-left');
        let rightButton = document.getElementById('scroll-right');
        if (show) {
            leftButton.style.display = 'block';
            rightButton.style.display = 'block';
        } else {
            leftButton.style.display = 'none';
            rightButton.style.display = 'none';
        }
    }

// Initialize an IntersectionObserver for the national graph scroll
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                toggleScrollButtons(true);
            } else {
                toggleScrollButtons(false);
            }
        });
    }, {threshold: [0.5]});

    let target = document.querySelector('#national-vis');
    scrollObserver.observe(target);

// Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });


    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Site theme change
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    const currentTheme = localStorage.getItem('theme');
    const themeToggleLabel = document.getElementById('theme-toggle-label'); // Make sure you have this element in your HTML

    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);

        if (currentTheme === 'dark') {
            toggleSwitch.checked = true;
            themeToggleLabel.textContent = 'Enable Light Mode!'; // Set the text for dark mode
        } else {
            themeToggleLabel.textContent = 'Enable Dark Mode!'; // Set the text for light mode
        }
    }

    function switchTheme(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleLabel.textContent = 'Enable Light Mode!'; // Change the text when dark mode is enabled
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggleLabel.textContent = 'Enable Dark Mode!'; // Change the text when light mode is enabled
        }
    }

    toggleSwitch.addEventListener('change', switchTheme, false);

}

// For Macro Dash
function calculateMarketValueChange(data, selectedColumn) {
    // Filter out rows with NA values for 'Market value of housing stock'
    const filteredData = data.filter(d => !isNaN(d[selectedColumn]));
    const minDate = d3.min(filteredData, d => new Date(d.date));
    const maxDate = d3.max(filteredData, d => new Date(d.date));

    // Find the market value at the minimum and maximum dates
    const minValue = filteredData.find(d => new Date(d.date).getTime() === minDate.getTime())[selectedColumn];
    const maxValue = filteredData.find(d => new Date(d.date).getTime() === maxDate.getTime())[selectedColumn];


    // Calculate the percentage change
    percentageChange = ((maxValue / minValue) - 1);

    return percentageChange;
}

// For Macro Dash
function createConsumerData(data) {
    consumer_data = [
        {
            category: 'Total Consumer Spending'
            , change: calculateMarketValueChange(data, "total_consumer_spending")
            , grouping: 'Total'
        },
        {
            category: 'Personal Care Goods and Services'
            , change: calculateMarketValueChange(data, "personal_gs")
            , grouping: 'Essential'
        },
        {
            category: 'Food and Non-Alcoholic Beverages'
            , change: calculateMarketValueChange(data, "food_bev")
            , grouping: 'Essential'
        },
        {
            category: 'Health Goods and Services'
            , change: calculateMarketValueChange(data, "health_gs")
            , grouping: 'Essential'
        },
        {
            category: 'Medical Products'
            , change: calculateMarketValueChange(data, "medical_products")
            , grouping: 'Essential'
        },
        {
            category: 'Travel and Hotels'
            , change: calculateMarketValueChange(data, "restaurants_hotels")
            , grouping: 'Discretionary'
        },
        {
            category: 'Eating Out'
            , change: calculateMarketValueChange(data, "eating_out")
            , grouping: 'Discretionary'
        },
        {
            category: 'Clothing and Footwear'
            , change: calculateMarketValueChange(data, "clothing")
            , grouping: 'Discretionary'
        },
        {
            category: 'Recreational'
            , change: calculateMarketValueChange(data, "rec_cult")
            , grouping: 'Discretionary'
        },
        {
            category: 'Household Furnishings'
            , change: calculateMarketValueChange(data, "household_expenditures")
            , grouping: 'Housing'
        },
        {
            category: 'Household Appliances'
            , change: calculateMarketValueChange(data, "household_appliances")
            , grouping: 'Housing'
        },
        {
            category: 'Household Garden Tools and Equipment'
            , change: calculateMarketValueChange(data, "household_outdoor")
            , grouping: 'Housing'
        },
        {
            category: 'Housing Maintenance and Repairs'
            , change: calculateMarketValueChange(data, "housing_maintenance")
            , grouping: 'Housing'
        },
    ];

    return consumer_data
}

// For Macro Dash
function createHousingData(data) {
    housing_data = [
        {
            category: 'Housing Market Value'
            , change: calculateMarketValueChange(data, "housing_market_value")
        },
        {
            category: 'Residential Sales Price Index'
            , change: calculateMarketValueChange(data, "sale_price_index")
        },
    ];

    return housing_data
}

function getColorDefinitions() {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
        textColor: rootStyle.getPropertyValue('--color-text').trim(),
        backgroundColor: rootStyle.getPropertyValue('--color-background').trim(),
        totalColor: rootStyle.getPropertyValue('--color1').trim(),
        essentialColor: rootStyle.getPropertyValue('--color2').trim(),
        discretionaryColor: rootStyle.getPropertyValue('--color3').trim(),
        housingColor: rootStyle.getPropertyValue('--color4').trim(),
        retailColor: rootStyle.getPropertyValue('--color3').trim(),
        officeColor: rootStyle.getPropertyValue('--color4').trim(),
        industrialColor: rootStyle.getPropertyValue('--color1').trim(),
        multifamilyColor: rootStyle.getPropertyValue('--color2').trim(),
        vColor: rootStyle.getPropertyValue('--color3').trim(),
        eColor: rootStyle.getPropertyValue('--color4').trim(),
        cColor: rootStyle.getPropertyValue('--color1').trim(),
        tColor: rootStyle.getPropertyValue('--color2').trim(),
        oColor: rootStyle.getPropertyValue('--color5').trim(),
        mColor: rootStyle.getPropertyValue('--color6').trim()
    };
}

