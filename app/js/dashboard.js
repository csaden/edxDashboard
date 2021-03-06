$(function() {

	var model = {

		init: function() {
			modelThis = this;

			// current student data
			currentStudent = null;
			modelThis.progressPoints = null;
			modelThis.attemptedPoints = null;
			modelThis.progressVideoTime = null;
			modelThis.attemptedVideoTime = null;
			modelThis.progressByLecture = null;
			modelThis.visits = null;
			modelThis.avgTimePerDay = null;
			modelThis.pointsPercentile = null;
			modelThis.videoTimePercentile = null;
			modelThis.detailsProgress= null;
			modelThis.lastVideoWatched = null;
			modelThis.lastProblemAttempted = null;
			
			// not currently used
			modelThis.accessedContent = null;

			// original csv data
			modelThis.minutesPerDay = null;
			modelThis.problems = null;
			modelThis.problemAttempts = null;
			modelThis.videos = null;
			modelThis.videoViews = null;

			// data created from original csv data using R / RStudio
			modelThis.allProgress = null;
			modelThis.allProgressByLecture = null;

			// parsed data from munging csv files
			modelThis.studentIds = [];
			modelThis.lectures = [];
			modelThis.details = null;
			modelThis.courseMap = null;
			modelThis.allTotalPoints = [];
			modelThis.allVideoTime = [];
			modelThis.dateExtents = null;
			modelThis.timeExtents = null;

			// values to compute
			modelThis.possiblePoints = null;
			modelThis.possibleVideoTime = null;
			modelThis.medianDailyVisit = null;
			modelThis.avgCertTime = null;

			$( document ).ready(function() {

				// toggle menu on small devices
				$(".right.menu.open").on("click", function(e) {
					e.preventDefault();
					$(".ui.vertical.menu").toggle();
				});

				// toggle nav on large devices
				$("#nav a.item").on("click", function() {
					$(this).addClass("active")
						.siblings()
						.removeClass("active");
				});

				$.when(

					getData("data/problems.csv"),
					getData("data/problem_attempts.csv"),
					getData("data/videos.csv"),
					getData("data/video_views.csv"),
					getData("data/minutes_per_day.csv"),
					getData("data/all_progress.csv"),
					getData("data/progress_by_lecture.csv")
				
				).then(function(a, b, c, d, e, f, g) {

					modelThis.problems = processData(a[0]);
					modelThis.problemAttempts = processData(b[0]);
					modelThis.videos = processData(c[0]);
					modelThis.videoViews = processData(d[0]);
					modelThis.minutesPerDay = processData(e[0]);
					modelThis.allProgress = processData(f[0]);
					modelThis.allProgressByLecture = processData(g[0]);

					// get and format minutesPerDay data to plot later
					// get student IDs at same time for dropdown
					modelThis.minutesPerDay.forEach(function(elem) {
						modelThis.studentIds.push(+elem.student_id);
						elem.student_id = +elem.student_id;
						elem.date = Date.parse(elem.date);
						elem.minutes_on_site = +elem.minutes_on_site;
					});

					// get unique student IDs as numbers
					modelThis.studentIds = d3.set(modelThis.studentIds)
						.values()
						.map(Number);

					// get median of the all students' median minutes on site
					modelThis.medianDailyVisit = d3.median(modelThis.allProgress, function(d) {
						return d.median_minutes_per_day;
					});

					// get avg minutes on site for certificate earners
					// assuming total score of 55%
					modelThis.avgCertTime = modelThis.allProgress.filter(function(d) {
						return d.total_score >= 55;
					});
					modelThis.avgCertTime = Math.round(d3.sum(modelThis.avgCertTime, function(d) {
						return d.total_minutes_on_site;
					}) / d3.sum(modelThis.avgCertTime, function(d) {
						return d.n;
					}));

					// get max and min date for site visits
					modelThis.dateExtents = d3.extent(modelThis.minutesPerDay, function(d) { return d.date; });

					// get max minutes for site visits
					modelThis.timeExtents = [0, d3.max(modelThis.minutesPerDay,
						function(d) { return d.minutes_on_site; })];

					// get general information on all problems
					modelThis.details = d3.nest()
						.key(function(d) { return d.section; })
						.key(function(d) { return d.subsection; })
						.map(modelThis.problems);

					var _allProblems = [],
						lectures,
						newObject;

					for (var weekKey in modelThis.details) {
						
						lectures = modelThis.details[weekKey];

						for (var lectureKey in lectures) {

							newObject = {};

							newObject["week"] = weekKey;
							newObject["lecture"] = lectureKey;
							newObject["problems"] = copyArray(lectures[lectureKey]);
							newObject["videos"] = null;
							newObject["max_total_time"] = null;
							newObject["max_total_points"] = d3.sum(lectures[lectureKey], function(d) { return +d.max_points;
							});
							_allProblems = Array.prototype.concat(_allProblems, newObject);
						}
					}

					modelThis.details = _allProblems;

					// get general information on all videos
					modelThis.videos = d3.nest()
						.key(function(d) { return d.section; })
						.key(function(d) { return d.subsection; })
						.map(modelThis.videos);

					var _allVideos = [],
						vidLectures;

					for (var vidWeekKey in modelThis.videos) {
						
						vidLectures = modelThis.videos[vidWeekKey];

						for (var vidLectureKey in vidLectures) {

							newObject = {};

							newObject["week"] = vidWeekKey;
							newObject["lecture"] = vidLectureKey;
							newObject["videos"] = copyArray(vidLectures[vidLectureKey]);
							newObject["max_total_time"] = d3.sum(vidLectures[vidLectureKey], function(d) {
								return +d.duration_seconds;
							});
							_allVideos = Array.prototype.concat(_allVideos, newObject);
						}
					}
					modelThis.videos = _allVideos;

					var thisWeek,
						thisLecture;

					// combine info from all problems and videos
					// by week and lecture
					for (var i = 0, l = modelThis.details.length; i < l; i++) {

						thisWeek = modelThis.details[i].week;
						thisLecture = modelThis.details[i].lecture;

						if (thisWeek === modelThis.videos[i].week && thisLecture === modelThis.videos[i].lecture) {

							modelThis.details[i]["videos"] = copyArray(modelThis.videos[i].videos);
							modelThis.details[i]["max_total_time"] = modelThis.videos[i].max_total_time;
						}
					}

					// set max points for course
					modelThis.possiblePoints = d3.sum(modelThis.problems,
						function(d) {
							return +d.max_points;
						});

					// set max video time for course
					modelThis.possibleVideoTime = d3.sum(modelThis.videos, function(d) {
						return +d.max_total_time;
					});

					// get video progress for accesssed videos by student
					modelThis.videoProgress = d3.nest()
						.key(function(d) { return d.student_id; })
						.rollup(function(d) {
							return {
								"watched_seconds" : d3.sum(d, function(g) {
									return +g.watched_seconds;
								}),
								"duration_seconds" : d3.sum(d, function(g) {
									return +g.duration_seconds;
								})
							};
						}).entries(modelThis.videoViews);

					// get problem and video ids to build course map
					modelThis.courseMap = getCourseNodes(modelThis.details);

					// get and format lecture ids for details table
					modelThis.details.forEach(function(elem) {
						if (elem.hasOwnProperty("lecture")) {
							var lectName = elem.lecture.replace(/\s+/g, '-');
							modelThis.lectures.push(lectName);
						}
					});

					// populate arrays of total video time and points
					// for percentile calculation
					modelThis.allProgress.forEach(function(elem) {
						if (elem.hasOwnProperty("total_score")) {
							var score = +elem.total_score;
							var videoTime = +elem.total_seconds;
							modelThis.allTotalPoints.push(score);
							modelThis.allVideoTime.push(videoTime);
						}
					});

					view.init();
				});
			});
		}
	};

	var ctrl = {
		init : function() {
			model.init();
		},
		setCurrentStudent : function(studentId) {
			model.currentStudent = +studentId;
		},
		getCourseMap : function() {
			return modelThis.courseMap;
		},
		setAccessedContent : function(studentId) {
			var content = [],
			problems = modelThis.problemAttempts.filter(function(element) {
				return +element.student_id === +studentId;
			}),
			videos = modelThis.videoViews.filter(function(element) {
				return +element.student === +studentId;
			});
			for (var i=0, l=problems.length; i<l; i++) {
				content.push(problems[i].problem_id);
			}
			for (i=0, l=videos.length; i<l; i++) {
				content.push(problems[i].video_id);
			}
			modelThis.accessedContent = content;
		},
		getAccessedContent : function() {
			return modelThis.accessedContent;
		},
		setPointsData : function(studentId) {
			var problems = modelThis.problemAttempts.filter(function(element) {
				return +element.student_id === +studentId;
			}, studentId);

			try {
				modelThis.lastProblemAttempted = "<a href='#' target='_blank'>" +  problems[problems.length - 1].problem_id + "</a>";
			} catch(err) {
				modelThis.lastProblemAttempted = "N/A";
			}

			if (problems.length > 0) {

				modelThis.progressPoints = d3.sum(problems, function(d) {
					return +d.score;
				});
				modelThis.attemptedPoints = d3.sum(problems, function(d){
					return +d.max_points;
				});
			} else {
				modelThis.progressPoints = 0;
				modelThis.attemptedPoints = 0;
			}
		},
		setVideosData : function(studentId) {
			var videos = modelThis.videoViews.filter(function(record) {
				return +record.student_id === +studentId;
			}, studentId);

			try {
				modelThis.lastVideoWatched = "<a href='#' target='_blank'>" + videos[videos.length - 1].video_id + "</a>"
			} catch(err) {
				modelThis.lastVideoWatched = "N/A";
			}
			if (videos.length > 0) {
				modelThis.progressVideoTime = d3.sum(videos, function(d) { return +d.watched_seconds;
				});
				modelThis.attemptedVideoTime = d3.sum(videos, function(d) { return +d.duration_seconds;
				});
			} else {
				modelThis.progressVideoTime = 0;
				modelThis.attemptedVideoTime = 0;
			}
		},
		setVisits : function(studentId) {
			modelThis.visits = modelThis.minutesPerDay.filter(function(record) { return +record.student_id === +studentId; }, studentId);
		},
		setAvgTimePerDay : function(studentId) {
			var avgTimePerDay;

			if (modelThis.visits !== null && modelThis.visits.length > 0) {
				avgTimePerDay = d3.sum(modelThis.visits, function(d) {
					return d.minutes_on_site;
				});
				avgTimePerDay = Math.round(avgTimePerDay / modelThis.visits.length);
			} else {
				avgTimePerDay = 0;
			}
			modelThis.avgTimePerDay = avgTimePerDay;
		},
		setProgressByLecture : function(studentId) {
			modelThis.progressByLecture = [];

			modelThis.allProgressByLecture.forEach(function(record) {
				if (+record.student_id === +studentId) {
					modelThis.progressByLecture.push(
						{
							lecture_points: +record.lecture_points,
							student_id: +record.student_id,
							subsection: record.subsection,
							watched_seconds: +record.watched_seconds
						}
					);
				}
			}, studentId);
		},
		setDetailsProgress : function(studentId) {
			modelThis.detailsProgress = modelThis.allProgress.filter(function(record) { return +record.student_id === +studentId; }, studentId)[0];
		},
		getDetailsProgress : function() {
			return modelThis.detailsProgress;
		},
		getAvgTimePerDay : function() {
			return modelThis.avgTimePerDay;
		},
		getStudentIds : function() {
			return modelThis.studentIds;
		},
		getCurrentStudent : function() {
			return model.currentStudent;
		},
		getLectures : function() {
			return modelThis.lectures;
		},
		getVisits : function(studentId) {
			return modelThis.visits;
		},
		getLastProblemAttempted : function() {
			return modelThis.lastProblemAttempted;
		},
		getLastVideoWatched : function () {
			return modelThis.lastVideoWatched;
		},
		getProgressPoints : function() {
			return modelThis.progressPoints;
		},
		getProgressVideoTime : function() {
			return modelThis.progressVideoTime;
		},
		getAttemptedPoints : function() {
			return modelThis.attemptedPoints;
		},
		getAttemptedVideoTime : function () {
			return modelThis.attemptedVideoTime;
		},
		getPossiblePoints : function() {
			return modelThis.possiblePoints;
		},
		getPossibleVideoTime : function() {
			return modelThis.possibleVideoTime;
		},
		getProgressByLecture : function() {
			return modelThis.progressByLecture;
		},
		getAllProgress : function() {
			return modelThis.allProgress;
		},
		getMinutesPerDay : function() {
			return modelThis.minutesPerDay;
		},
		getDateExtents : function() {
			return modelThis.dateExtents;
		},
		getTimeExtents : function() {
			return modelThis.timeExtents;
		},
		getDetails : function() {
			return modelThis.details;
		},
		getMedian : function() {
			return modelThis.medianDailyVisit;
		},
		getAvgCertTime : function() {
			return modelThis.avgCertTime;
		},
		getPointsPercentile : function() {
			var percentile = d3.scale.quantile()
				.domain(d3.extent(modelThis.allTotalPoints))
				.range(d3.range(1, 100));
			return percentile(modelThis.attemptedPoints);
		},
		getVideoTimePercentile : function () {
			var percentile = d3.scale.quantile()
				.domain(d3.extent(modelThis.allVideoTime))
				.range(d3.range(1, 100));
			return percentile(modelThis.attemptedVideoTime);
		},
		getCurrentGrade : function() {
			var grade = Math.round(ctrl.getProgressPoints() / ctrl.getPossiblePoints() * 100);
			if (55 <= grade && grade <= 64) {
				grade += ("% " + " C");
			} else if (65 <= grade && grade <= 79) {
				grade += ("% " + " B");
			} else if (80 <= grade && grade <= 100) {
				grade += ("% " + " A");
			} else if (grade > 100) {
				grade += ("% " + " A+");
			} else {
				grade += "%";
			}
			return grade;
		},
		updateStudentData : function(studentId) {
			this.setVideosData(studentId);
			this.setPointsData(studentId);
			this.setVisits(studentId);
			this.setAvgTimePerDay(studentId);
			this.setProgressByLecture(studentId);
			this.setDetailsProgress(studentId);
			this.setAccessedContent(studentId);
		}
	};

	var view = {
		init : function() {

			d3.select("#attendance-chart")
				.append("svg")
				.attr("class", "time-on-site-graph")
				.attr("width", 1200)
				.attr("height", 150);

			this.createDropDown();
			this.createLectureTable();

			drawBarContainer("#progress-points-bar", 100, 20);
			drawBarContainer("#progress-video-time-bar", 100, 20);
			drawBarContainer("#total-points-bar", 100, 20);
			drawBarContainer("#total-video-time-bar", 100, 20);

			drawBarContainer(".lect-problem-bar", 100, 20);
			drawBarContainer(".lect-video-bar", 100, 20);

			$(":input[name='currentStudent']").on("change", function() {
				ctrl.setCurrentStudent(this.value);
				ctrl.updateStudentData(this.value);
				view.render();
			});

			$('input').on('change', function(){
				$('.long.arrow.right.pink').hide();
			});

			this.createAllProgressGraph();
		},
		createDropDown : function() {

			var dropdown = d3.select('#students');

			dropdown.selectAll('item.student')
				.data(ctrl.getStudentIds())
				.enter()
				.append('div')
				.attr('class', 'item')
				.attr('data-value', function(d) { return d; })
				.text(function(d) { return 'Student ' + d; })
				.html(function(d) {
					return '<i class="user icon"></i>Student ' + d;
			});

			$(".ui.dropdown").dropdown();
		},
		createDetailsTable : function() {

			var data = ctrl.getDetails();

			weekRow.each(function(d) {

				var current = d3.select(this).append("tr")
					.attr("class", "problem-set");

				var problemLength = d.problems.length;

				for (var i = 0; i < problemLength; i++) {

					current.append("td")
						.attr("class", "problem-id")
						.attr("id", d.problems[i].id)
						.attr("value", function(d) {
							return +d.problems[i].max_points;
						});
				}

			});

			weekRow.append("td")
				.attr("class", "video-total")
				.attr("value", function(d) { return +d.max_total_time; })
				.attr("id", function(d) {
					return d.lecture.replace(/\s+/g, '-') + "-videos";
				});

			weekRow.append("td")
				.attr("class", "video-bar")
				.attr("value", function(d) { return +d.max_total_time; })
				.attr("id", function(d) {
					return d.lecture.replace(/\s+/g, '-') + "-video-bar";
				});
		},
		createLectureTable : function() {

			var data = ctrl.getDetails();

			var lectRow = d3.select(".lecture-progress-table")
				.selectAll(".lecture-row")
				.data(data)
				.enter()
				.append("div")
				.attr("class", "lecture-row");

			var lect = lectRow.append("div")
				.attr("class", "lecture")
			
			lect.append("input")
				.attr("type", "checkbox")
				.attr("name", function(d) {return d.lecture; })
			
			lect.append("div")
				.attr("class", "lect-num")
				.text(function(d) { return d.lecture; });

			lectRow.append("div")
				.attr("class", "data lect-data lect-problem-total")
				.attr("value", function(d) { return +d.max_total_points; })
				.attr("id", function(d) {
					return "lect-problems-" + d.lecture.replace(/\s+/g, '-');
				});

			lectRow.append("div")
				.attr("class", "lect-data lect-problems-percent")
				.attr("value", function(d) { return +d.max_total_points; })
				.attr("id", function(d) {
					return "lect-problems-percent-" + d.lecture.replace(/\s+/g, '-');
				});

			lectRow.append("div")
				.attr("class", "lect-problem-bar")
				.attr("value", function(d) { return +d.max_total_points; })
				.attr("id", function(d) {
					return "lect-prob-bar-" + d.lecture.replace(/\s+/g, '-');
				});

			lectRow.append("div")
				.attr("class", "data lect-data lect-video-total")
				.attr("value", function(d) { return +d.max_total_time; })
				.attr("id", function(d) {
					return "lect-videos-" + d.lecture.replace(/\s+/g, '-');
				});

			lectRow.append("div")
				.attr("class", "lect-data lect-videos-percent")
				.attr("value", function(d) { return +d.max_total_time; })
				.attr("id", function(d) {
					return "lect-videos-percent-" + d.lecture.replace(/\s+/g, '-');
				});

			lectRow.append("div")
				.attr("class", "lect-video-bar")
				.attr("value", function(d) { return +d.max_total_time; })
				.attr("id", function(d) {
					return "lect-video-bar-" + d.lecture.replace(/\s+/g, '-');
				});
		},
		createAllProgressGraph : function() {
			var margin = {top: 40, right: 15, bottom: 50, left: 80},
				width = parseInt(d3.select("#scatter-chart").style("width"), 10)
				width = width - margin.left - margin.right,
				height = parseInt(d3.select("#scatter-chart").style("height"), 10),
				height = height - margin.top - margin.bottom;

			var student_tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function(d) {
					return "<span>Grade:</span> <span style='color:#DE7DAE'>" + d.total_score + "%</span> <br> <span>Videos Watched:</span> <span style='color:#DE7DAE'>" + Math.round(d.total_seconds / ctrl.getPossibleVideoTime() * 100) + "%" + "</span> <br> <span>Total Video Time:</span> <span style='color:#DE7DAE'>" + Math.round(
						d.total_seconds / 60) + " mins" + "</span>";
				});

			var data = ctrl.getAllProgress();

			// set the scales for the x and y axis
			var x = d3.scale.linear()
					.domain([0, 100])
					.range([0, width]);

			var y = d3.scale.linear()
				.domain([0, 100])
				.range([height, 0]);

			// responsive chart source: http://eyeseast.github.io/visible-data/2013/08/28/responsive-charts-with-d3/

			d3.select(window).on("resize", resize);

			function resize() {
				// update the width and the height
				width = parseInt(d3.select("scatter-chart").style("width"), 10);
				height = parseInt(d3.select("scatter-chart").style("height"), 10);

				x.range([0, width]);
				y.range([0, height]);

				// resize the chart
				d3.select(svg.node().parentNode)
					.style("width", (width + margin.left + margin.right) + "px")
					.style("height", (height + margin.top + margin.bottom) + "px");

				svg.selectAll("circle")
					.attr("cx", function(d) {
						return x(d.total_seconds / ctrl.getPossibleVideoTime() * 100);
					})
					.attr("cy", function(d) {
						return y(d.total_score / ctrl.getPossiblePoints() * 100);
					})

				// update axes
				svg.select("x axis").call(xAxis)
				svg.select("y axis").call(yAxis)
			}

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var svg = d3.select("#scatter-chart")
				.append("svg")
				.attr("class", "all-student-progress-graph")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				// .call(d3.behavior.zoom().on("zoom", function() {
				// 	svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
				// }))
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			svg.call(student_tip);

			// draw xAxis
			xAxisG = svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			xAxisG.append("text")
				.attr("x", width / 2)
				.attr("y", margin.bottom - 15)
				.attr("text-anchor", "middle")
				.text("Videos Watched (%)");

			// draw yAxix
			yAxisG = svg.append("g")
				.attr("class", "y axis")
				.call(yAxis);

			yAxisG.append("text")
				.attr("x", 0)
				.attr("y", -15)
				.attr("text-anchor", "end")
				.text("Grade (%)");

			svg.selectAll("circle")
				.data(data)
				.enter()
				.append("svg:circle")
				.attr("class", ".points")
				.attr("id", function(d) {
					return "point-" + d.student_id;
				})
				.attr("r", 4)
				.attr("opacity", 0.2)
				.attr("cy", function(d) {
					return y(d.total_score / ctrl.getPossiblePoints() * 100);
				})
				.attr("cx", function(d) {
					return x(d.total_seconds / ctrl.getPossibleVideoTime() * 100);
				})
				.on("mouseover", student_tip.show)
				.on("mouseout", student_tip.hide);

			d3.select(".me-button").on("click", showMe);

			function showMe() {
				console.log("#point-" + ctrl.getCurrentStudent());
				view.growCircle("#point-" + ctrl.getCurrentStudent());
			}
		},
		createTimeOnSiteGraph : function(records, wid, hgt) {

			var margin = {top: 25, right: 0, bottom: 70, left: 60},
				width = wid - margin.left - margin.right,
				height = hgt - margin.top - margin.bottom;

			var svg = d3.select("#attendance-chart")
				.append("svg")
				.attr("class", "time-on-site-graph")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var formatDate = d3.time.format("%x");

			// create tooltips
			var tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function(d) {
					return "<span>Date:</span> <span style='color:#DE7DAE'>" + formatDate(new Date(d.date)) + "</span> <br> <span>Minutes:</span> <span style='color:#DE7DAE'>" + d.minutes_on_site + "</span>";
				});

			var median_tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function(d) {
					return "<span>Most students spent at least </span> <span style='color:#BEBEBE'>" + ctrl.getMedian() + " minutes</span> <span> on the site each time they visited.</span>";
				});

			var cert_tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function(d) {
					return "<span>Students who earned a <span style='color: #DE7DAE'>certificate</span> in this class spent about <span style='color:#DE7DAE'> " + ctrl.getAvgCertTime() + " minutes</span> <span> on the site each time they visited.</span>";
				});

			svg.call(tip);
			svg.call(median_tip);
			svg.call(cert_tip);

			// set the scales for the x and y axis
			var x = d3.time.scale()
					.domain(ctrl.getDateExtents())
					.range([0, width]);
				

			var maxMins = d3.max(records, function(d) {
				return d.minutes_on_site;
			});

			var maxTime = Math.max(maxMins, ctrl.getMedian(), ctrl.getAvgCertTime());

			var y = d3.scale.linear()
					.domain([0, maxTime])
					.range([height, 0]);

			// draw xAxis
			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.tickFormat(d3.time.format("%x"));

			var xAxisG = svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")");

			xAxisG.transition()
				.duration(500)
				.call(xAxis);

			xAxisG.selectAll("text")
				.attr("transform", "rotate(-30)")
				.attr("dx", "-.3em")
				.attr("dy", ".9em")
				.style("text-anchor", "end");

			// draw yAxis
			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var yAxisG = svg.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(-10, 0)");

			yAxisG.transition()
				.duration(500)
				.call(yAxis);

			yAxisG.append("text")
				.attr("x", 0)
				.attr("y", -20)
				.attr("dy", ".7em")
				.attr("text-anchor", "end")
				.text("Minutes");

			var xDomain = ctrl.getDateExtents();

			// set the bar width
			var barWidth = width / Math.floor(( xDomain[1] - xDomain[0]) / 86400000);

			d3.selectAll(".attendance-bars")
				.transition()
				.duration(250)
				.attr("y", height)
				.attr("height", 0)
				.remove();

			var bars = svg.selectAll("rect")
				.data(records)
				.enter()
				.append("svg:rect")
				.attr("class", "attendance-bars")
				.attr("fill", "#71C3E8")
				.attr("x", function(d) {
					return x(d.date);
				})
				.attr("y", function(d) {
					return height;
				})
				.attr("width", barWidth - 2)
				.attr("height", 0)
				.on("mouseover", tip.show)
				.on("mouseout", tip.hide);

			bars.transition()
				.duration(1500)
				.attr("height", function(d) {
					return height - y(d.minutes_on_site);
				})
				.attr("y", function(d) {
					return y(d.minutes_on_site);
				});

			// add median line of all the students' median minutes_on_site
			var medianLineData = [	{ "x" : 0, "y" : ctrl.getMedian() },
									{ "x" : width, "y" : ctrl.getMedian() }];

			var createMedianLine = d3.svg.line()
				.x(function(d) { return d.x;} )
				.y(function(d) { return y(d.y);} )
				.interpolate("linear");

			svg.append("path")
				.attr("class", "median")
				.attr("d", createMedianLine(medianLineData))
				.on("mouseover", median_tip.show)
				.on("mouseout", median_tip.hide);

			// add avg minutes_on_site for certificate earners
			var certLineData = [	{ "x" : 0, "y" : ctrl.getAvgCertTime() },
									{ "x" : width, "y" : ctrl.getAvgCertTime() }];

			var createCertLine = d3.svg.line()
				.x(function(d) { return d.x;} )
				.y(function(d) { return y(d.y);} )
				.interpolate("linear");

			svg.append("path")
				.attr("class", "cert")
				.attr("d", createCertLine(certLineData))
				.on("mouseover", cert_tip.show)
				.on("mouseout", cert_tip.hide);
		},
		colorCurrentStudent : function() {
			d3.select(".youAreHere")
				.attr("class", "points")
				.attr("r", 4);

			this.growCircle("#point-" + ctrl.getCurrentStudent());
		},
		growCircle : function(elem_id) {
			d3.select(elem_id)
				.attr("class", "points youAreHere")
				.transition()
				.duration(1000)
				.attr("r", 25)
				.transition()
				.duration(500)
				.attr("r", 7);
		},
		render : function() {
			
			// remove current data .inner-rect from the page
			d3.selectAll(".inner-rect")
				.transition()
				.duration(250)
				.attr("width", 0)
				.remove();

			// remove time on site graph for current student
			d3.select(".time-on-site-graph")
				.remove();
			
			// set most recent work
			d3.selectAll(".last-problem").html(ctrl.getLastProblemAttempted());
			d3.selectAll(".last-video").html(ctrl.getLastVideoWatched());

			// color current student point in scatterplot
			this.colorCurrentStudent();

			// draw four main bars for work in progress and total progress
			drawBar("#progress-points-bar", 100, 20, ctrl.getProgressPoints(), ctrl.getAttemptedPoints());
			
			drawBar("#progress-video-time-bar", 100, 20, ctrl.getProgressVideoTime(), ctrl.getAttemptedVideoTime());
			
			drawBar("#total-points-bar", 100, 20, ctrl.getProgressPoints(), ctrl.getPossiblePoints());
			
			drawBar("#total-video-time-bar", 100, 20, ctrl.getProgressVideoTime(), ctrl.getPossibleVideoTime());

			// bind summary data to top two tables
			d3.select("#daily-time").text("~" + ctrl.getAvgTimePerDay() + " min");
			
			d3.select("#progress-points").text(ctrl.getProgressPoints() + " / " + ctrl.getAttemptedPoints());

			d3.select("#progress-points-percent").text(Math.floor(safeDivide(+ctrl.getProgressPoints(), +ctrl.getAttemptedPoints()) * 100) + "%");
			
			d3.select("#progress-video-time").text(formatTime(ctrl.getProgressVideoTime()));

			d3.select("#progress-attempted-time").text(formatTime(ctrl.getAttemptedVideoTime()));

			d3.select("#progress-video-time-percent").text(Math.floor(safeDivide(+ctrl.getProgressVideoTime(), +ctrl.getAttemptedVideoTime()) * 100) + "%");
			
			d3.select("#total-points").text(ctrl.getProgressPoints() + " / " + ctrl.getPossiblePoints());

			d3.select("#total-points-percentile").text(Math.floor(
				safeDivide(+ctrl.getProgressPoints(), +ctrl.getPossiblePoints()) * 100) + "%");
			
			d3.select("#total-video-time").text(formatTime(ctrl.getProgressVideoTime()));

			d3.select("#total-video-time-percentile").text(Math.floor(safeDivide(+ctrl.getProgressVideoTime(), +ctrl.getPossibleVideoTime()) *100) + "%");

			d3.select("#total-possible-time").text(formatTime(ctrl.getPossibleVideoTime()));
			
			d3.select("#current-grade").text(ctrl.getCurrentGrade());

			d3.select("#points-class-percentile").text(ctrl.getPointsPercentile() + "%");

			d3.select("#video-time-class-percentile").text(ctrl.getVideoTimePercentile() + "%");

			// bind progressByLecture data to the lecture progress display

			var lectureData, // student progress by lecture
				elem, // HTML placeholder elem to bind lecture data
				lect, // lecture name for id of elem; will add suffix
				o; // one lecture record for student in lectureData

			lectureData = ctrl.getProgressByLecture();
			for (var i=0, l=lectureData.length; i < l; i++) {
				
				o = lectureData[i];
				lect = o.subsection;
				
				// bind lecture points
				elem = d3.select("#lect-problems-" + lect);
				elem.text( o.lecture_points + " / " + elem.attr("value") );

				// bind lecture points percentage
				elem = d3.select("#lect-problems-percent-" + lect);
				elem.text(Math.floor(safeDivide(o.lecture_points, elem.attr("value")) * 100) + "%");

				// draw bar for lecture points
				drawBar("#lect-prob-bar-" + lect, 100, 20, o.lecture_points, +elem.attr("value"));

				// bind lecture video minutes
				elem = d3.select("#lect-videos-" + lect);
				elem.text(toMins(o.watched_seconds) + " / " + toMins(elem.attr("value")));

				// bind lecture video time percentage
				elem = d3.select("#lect-videos-percent-" + lect);
				elem.text(Math.floor(safeDivide(o.watched_seconds, elem.attr("value")) * 100) + "%");

				// draw bar lecture video minutes
				drawBar("#lect-video-bar-" + lect, 100, 20, o.watched_seconds, +elem.attr("value"));
			}

			this.createTimeOnSiteGraph(ctrl.getVisits(), 1200, 300);
		}
	};
	ctrl.init();
});

			// bind data to individual problem scores
			// var details = ctrl.getDetailsProgress();
			// for ( var key in details ) {
			// 	if ( key.match(/^lec[0-9]+_p[0-9]+$/) !== null && key === key.match(/^lec[0-9]+_p[0-9]+$/)[0] ) {
			// 		elem = d3.select("#" + key);
			// 		elem.text(details[key] + "/" + elem.attr("value"));
			// 	}
			// }

			// draw time on site chart