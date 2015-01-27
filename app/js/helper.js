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
			var keyValue = text.split(":");
			newDataObject[keyValue[0]] = keyValue[1];
		});
		processedData.push(newDataObject);
	});
	return processedData;
}

function getMaxObjectValue(this_array, element) {
    var values = [];
 
    for (var i = 0; i < this_array.length; i++) {
        values.push(Math.ceil(parseFloat(this_array[i][""+element])));
    }
 
    values.sort(function(a,b){return a-b;});
 
    return values[values.length-1];
}
 
function getMinObjectValue(this_array, element) {
    var values = [];
 
    for (var i = 0; i < this_array.length; i++) {
        values.push(Math.floor(parseFloat(this_array[i][""+element])));
    }
    
    values.sort(function(a,b){return a-b;});
 
    return values[0];
}

function createBar(idToAppendTo, width, height) {

	var elem = d3.select(idToAppendTo);
	elem.append("svg")
		.width(width)
		.height(height)
		.append("rect")
		.attr("class", "outer-rect")
		.attr("x", 0)
		.attr("y", height/2)
		.width(width)
		.height(height)
		.append("x", 0)
		.append("y", height/2)
		.width(width)
		.height(height)
		.fill("gray");
}

Array.prototype.unique = function() {
	var n = {}, r = [];
	
	for(var i = 0; i < this.length; i++) {
		
		if (!n[this[i]]) {
			n[this[i]] = true;
			r.push(this[i]);
		}
	}

	return r;
};