// Map
function init() {
    var OCCUPANCY_SCALE = 0.1;
    var BARWIDTH = 40;
    var map = L.map('map').setView([51.385802, -2.370667], 15);
    mapLink =
        '<a href="http://openstreetmap.org">OpenStreetMap</a>';
    L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            //attribution: '&copy; ' + mapLink + ' Contributors',
            maxZoom: 15,
            minZoom: 15
        }).addTo(map);

    map.attributionControl.setPrefix(''); // Don't show the 'Powered by Leaflet' text.

    /* Initialize the SVG layer */
    map._initPathRoot()

    /* We simply pick up the SVG from the map object */
    var svg = d3.select("#map").select("svg"),
        g = svg.append("g");
    map.on("viewreset", update);

    var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    function nth(d) {
        if(d>3 && d<21) return 'th'; // thanks kennebec
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }
    function padTwo(d){
        if(d < 10){
            return "0"+d;
        }
        else{
            return ""+d;
        }
    }

    function getToFromDates(){
        var fromDate = $('#data-from-year option:selected').val() + "-"+$('#data-from-month option:selected').val()+"-"+$('#data-from-day option:selected').val();
        var fromDate = new Date(fromDate);
        var toDate = $('#data-to-year option:selected').val() + "-"+$('#data-to-month option:selected').val()+"-"+$('#data-to-day option:selected').val();
        var toDate = new Date(toDate);

        return({from: fromDate, to: toDate});
    }

    function update(timeRow) {
        var circles = g.selectAll(".pollutioncircle")
            .data(timeRow,function(d) {
              return d.carParkName;
          })

        circles.exit().remove();
        var enterCircles = circles.enter();


        var transitionTime = 100;
        if( speed == 1 ){
            transitionTime = 500;
        }

        enterCircles.append("rect")
          .attr('class', 'pollutioncircle')
          .style("opacity", 0.4)
          .attr("height", 0)
          .attr("width", BARWIDTH)
          .attr("fill", "black");

        d3.selectAll('.pollutioncircle')
          .transition().duration(transitionTime).ease("linear")
            .attr("transform",
            function(d) {
                var mapLoc = map.latLngToLayerPoint([carParkDetails[d.carParkName].latitude, carParkDetails[d.carParkName].longitude]);
                var translateY = mapLoc.y - d.occupancy*OCCUPANCY_SCALE; //Make bars fill "upwards".
                var translateX = mapLoc.x - BARWIDTH/2;

                return "translate("+
                    translateX +","+
                    translateY +")";
            })
            .attr("height", function(d){
                if(d.occupancy && !isNaN(d.occupancy) ){
                    return d.occupancy*OCCUPANCY_SCALE;
                }
                else{
                    return 0;
                }
            })
            .style("fill", function(d){
              var fractionFull =  d.occupancy / carParkDetails[d.carParkName].capacity;
              var redness = fractionFull;
              var greenness = 1-redness;
              return 'rgb('+redness*255+','+greenness*255+',0)';
            });

        $( "#date-range" ).val( currentSelectedDate.getDate()+nth(currentSelectedDate.getDate())+" "+monthNames[currentSelectedDate.getMonth()]+" "+currentSelectedDate.getFullYear() );
        $( "#time-range" ).val( (currentSelectedDate.getHours()<10?'0':'') + currentSelectedDate.getHours()+":"+(currentSelectedDate.getMinutes()<10?'0':'') + currentSelectedDate.getMinutes() );
        var fromDate = getToFromDates().from;
        var toDate = getToFromDates().to;
        $( "#slider" ).slider("value", Math.floor((currentSelectedDate-fromDate)/(1000*60*60*24)) );
    }

    var fromDate = new Date();
    fromDate.setDate( fromDate.getDate() - 1 );
    var toDate = new Date();
    var currentSelectedDate = new Date(fromDate);
    var interval;
    var allData;
    var carParkDetails;
    var speed = 1;

    //Default to the most recent week (a month takes too long to get from Socrata).
    $('#data-from-day').val( padTwo(fromDate.getDate()) );
    $('#data-from-month').val( padTwo(fromDate.getMonth()+1) );
    $('#data-from-year').val( fromDate.getFullYear() );

    $('#data-to-day').val( padTwo(toDate.getDate()) );
    $('#data-to-month').val( padTwo(toDate.getMonth()+1) );
    $('#data-to-year').val( toDate.getFullYear() );

    onDateRangeUpdate();

    $('select').on('change', function(){
        onDateRangeUpdate();
    });

    function onDateRangeUpdate(){
        // jQuery UI
        var fromDate = getToFromDates().from;
        fromDate.setHours(7);
        var toDate = getToFromDates().to;
        toDate.setHours( 23 );
        toDate.setMinutes( 59 );
        currentSelectedDate = fromDate;

        var days = (toDate-fromDate)/(1000*60*60*24);

        $( "#slider" ).slider({
            value:0,
            min: 0,
            max: days,
            step: 1,
            slide: function( event, ui ) {
                var fromDate = getToFromDates().from;
                var toDate = getToFromDates().to;

                currentSelectedDate = new Date(fromDate.setDate( fromDate.getDate()+ui.value));
            }
        });

        $.getJSON('carParks.php', function(carParksResponse){
            carParkDetails = carParksResponse;

            var boundaryCircles = g.selectAll(".boundary")
              .data(_.values(carParkDetails), function(d){
                return d.name;
              })

            boundaryCircles.exit().remove();
            boundaryCircles.enter().append("rect")
              .attr('class', 'boundary')
              .style("opacity", 1)
              .attr("height", function(d) {
                  return d.capacity*OCCUPANCY_SCALE;
              })
              .attr("width", BARWIDTH)
              .attr("fill", "none")
              .attr("stroke-width", "1")
              .attr("stroke", "black")
              .attr("transform",
              function(d) {
                  var mapLoc = map.latLngToLayerPoint([d.latitude, d.longitude]);
                  var translateY = mapLoc.y - d.capacity*OCCUPANCY_SCALE; //Align the BOTTOM of the box at the coords, not the top.
                  var translateX = mapLoc.x - BARWIDTH/2;
                  return "translate("+
                    translateX +","+
                    translateY +")";
              });

        })


        $.getJSON('pulldata.php?startDate='+fromDate.toISOString()+'&endDate='+ toDate.toISOString(), function(response){
            //console.log( JSON.stringify(response));
            //Create reponse of form:
            // {2001-01-01: {location: X, reading: 1.1},{location:Y, reading: 2.2},
            //  2001-01-02: {location: X, reading: 1.2}, {location:Y, reading: 2.3},
            // ...}
            /*response = [
                {"id":"2a2e5cfa89bc197adedbf4a3dd327d70","co":"0.2500","sensor_location":{"needs_recoding":false,"longitude":"-2.35903402755172","latitude":"51.3822189160466"},"nox":"21.5000","no2":"17.0000","no":"5.5000","sensor_location_name":"Bath Guildhall","sensor_location_slug":"guildhall","datetime":"2014-09-17T00:30:00"},
                {"id":"1808623cdccda4044735494326b1a96a","co":"0.2250","sensor_location":{"needs_recoding":false,"longitude":"-2.35903402755172","latitude":"51.3822189160466"},"nox":"29.5000","no2":"26.5000","no":"4.5000","sensor_location_name":"Bath Guildhall","sensor_location_slug":"guildhall","datetime":"2014-09-23T19:00:00"},
                {"id":"8e3bdd321f3de6251db698f38bcf09ca","co":"0.3000","sensor_location":{"needs_recoding":false,"longitude":"-2.35903402755172","latitude":"51.3822189160466"},"nox":"67.5000","no2":"24.0000","no":"45.0000","sensor_location_name":"Bath Guildhall","sensor_location_slug":"guildhall","datetime":"2014-09-18T12:45:00"},
                {"id":"e5f51a32c71918d79a5ea29d38bedd90","co":"0.4000","sensor_location":{"needs_recoding":false,"longitude":"-2.35903402755172","latitude":"51.3822189160466"},"nox":"112.0000","no2":"37.0000","no":"76.5000","sensor_location_name":"Bath Guildhall","sensor_location_slug":"guildhall","datetime":"2014-09-19T15:15:00"},
                {"id":"8faec0fccf5400758cdfaf271ee57d0e","co":"0.2000","sensor_location":{"needs_recoding":false,"longitude":"-2.35903402755172","latitude":"51.3822189160466"},"nox":"17.0000","no2":"17.0000","no":"1.5000","sensor_location_name":"Bath Guildhall","sensor_location_slug":"guildhall","datetime":"2014-09-23T21:45:00"}
            ];*/
            allData = {};
            var carParkArrays = {};
            response.forEach( function(reading){
                reading.lastupdate = new Date(reading.lastupdate);
                var carParkArray = carParkArrays[reading.name];
                if( !carParkArray ){
                    carParkArray = [];
                    carParkArrays[reading.name] = carParkArray;
                }
                carParkArray.push(reading);
            });

            _.keys(carParkArrays).forEach( function(carParkName) {
                var readings = carParkArrays[carParkName];
                var readingIdx = 0;
                var time = new Date(fromDate)
                while( time < toDate ){
                    if( readings[readingIdx] && readings[readingIdx+1] ) {
                        if (time > readings[readingIdx + 1].lastupdate) {
                            //The time has passed the time of the next reading. Move along one.
                            readingIdx++;
                            continue;
                        }
                        else {
                            var earlyReading = readings[readingIdx];
                            var lateReading = readings[readingIdx + 1];

                            var periodLength = lateReading.lastupdate - earlyReading.lastupdate;
                            var fractionThroughPeriod = (time - earlyReading.lastupdate) / periodLength;
                            var occupancyDifference = lateReading.occupancy - earlyReading.occupancy;

                            var interpolatedOccupancy = Math.round(earlyReading.occupancy + fractionThroughPeriod * occupancyDifference);
                            var readingsAtPointInTime = allData[time.toISOString()]
                            if (!readingsAtPointInTime) {
                                readingsAtPointInTime = [];
                                allData[time.toISOString()] = readingsAtPointInTime;
                            }
                            readingsAtPointInTime.push({carParkName: carParkName, occupancy: interpolatedOccupancy});
                            time.setMinutes(time.getMinutes() + 5);
                        }
                    }
                    else{
                        //Reached the end. Set to 0.
                        var readingsAtPointInTime = allData[time.toISOString()]
                        if (!readingsAtPointInTime) {
                            readingsAtPointInTime = [];
                            allData[time.toISOString()] = readingsAtPointInTime;
                        }
                        readingsAtPointInTime.push({carParkName: carParkName, occupancy: 0});
                        time.setMinutes(time.getMinutes() + 5);
                    }
                }
            });
            //console.log(JSON.stringify(allData));
        });
    }

    function stop(){
        clearInterval( interval );
        interval = null;
        $('#play-icon').addClass('stopped');
        $('#play-icon').removeClass('playingfast');
        $('#play-icon').removeClass('playing');
    }

    function play(){
        speed = 1;
        clearInterval( interval );
        interval = setInterval(function(){
            currentSelectedDate = new Date(currentSelectedDate.setMinutes( currentSelectedDate.getMinutes()+5));
            update(allData[currentSelectedDate.toISOString()]);
            $('#play-icon').removeClass('playingfast');
            $('#play-icon').removeClass('stopped');
            $('#play-icon').addClass('playing');
        }, 500 );
    }

    function playfast(){
        speed = 2;
        clearInterval( interval );
        interval = setInterval(function(){
            currentSelectedDate = new Date(currentSelectedDate.setMinutes( currentSelectedDate.getMinutes()+5));
            update(allData[currentSelectedDate.toISOString()]);
            $('#play-icon').removeClass('stopped');
            $('#play-icon').removeClass('playing');
            $('#play-icon').addClass('playingfast');
        }, 100 );
    }

    $('#play-icon').on('click', function(){
        if( interval && speed == 1){
            playfast();
        }
        else if( interval && speed == 2 ){
            stop();
        }
        else{
            play();
        }
    });

    play();
}