function getData(filepath) {
	return $.ajax(
			{
				url: filepath,
				error: function(request, status, error) {
					console.log(status, "\n\n", error);
				}
			}
	);
}

function processData(allText) {
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    var lines = [];

    for (var i=1; i<allTextLines.length; i++) {
        
        var data = allTextLines[i].split(',');
        
        if (data.length == headers.length) {
            
            var tarr = [];
            
            for (var j=0; j<headers.length; j++) {
            
                tarr.push(headers[j]+":"+data[j]);
            
            }
            
            lines.push(tarr);
        }
    }

	var processedData = [];
	
	lines.forEach(function(line) {
		
		var newDataObject = {};
		
		line.forEach(function(text) {
			
			var keyValuePair = text.split(":");
			var key = keyValuePair[0].replace(/"/g, "");
			var value = keyValuePair[1];
			newDataObject[key] = value;
		});
		
		processedData.push(newDataObject);
	
	});
	
	return processedData;
}

function copyArray(array) {

	newArray = [];
	arrayLength = array.length;

	for (var idx = 0; idx < arrayLength; idx++) {
		newArray[idx] = array[idx];
	}
	return newArray;
}

function getCourseNodes(detailsArray) {

	var allNodes = [];

	var array = copyArray(detailsArray);

	var arrayLength = array.length;

	for (var i = 0; i < arrayLength; i++) {

		var tempIds = [];
		var problems = copyArray(array[i].problems);
		var videos = copyArray(array[i].videos);

		var minIdx = Math.min(problems.length, videos.length);

		for (var j = 0; j < minIdx; j++) {

			var video = videos.shift();
			tempIds.push(video.id);

			var problem = problems.shift();
			tempIds.push(problem.id);

		}
		while (videos.length !== 0) {
			var vid = videos.shift();
			tempIds.push(vid.id);
		}
		while (problems.length !== 0) {
			var prob = problems.shift();
			tempIds.push(prob.id);
		}
		allNodes = allNodes.concat(tempIds);
	}
	return allNodes;
}

function drawBarContainer(selector, width, height) {

	var svg = d3.selectAll(selector)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("rect")
		.attr("class", "outer-rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", width)
		.attr("height", height)
		.attr("stroke", "#999")
		.attr("fill", "white");

}

function drawBar(id, width, height, data, total) {


	var length = d3.scale.linear()
		.domain([0, total])
		.range([0, width]);

	d3.select(id)
		.select("svg")
		.append("rect")
		.attr("class", "inner-rect")
		.attr("fill", "#71C3E8")
		.attr("y", 1)
		.attr("height", height-2)
		.attr("width", 0)
		.transition()
		.duration(2000)
		.delay(500)
		.attr("x", 0)
		.attr("width", length(data));

		// to round corners of rectangles
		// .attr("rx", radius)
		// .attr("ry", radius)
}

function formatTime(num) {

    var sec_num = parseInt(+num, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}

    var time    = hours+':'+minutes+':'+seconds;

    return time;
};