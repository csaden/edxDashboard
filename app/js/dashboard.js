$(function() {

	var model = {

		init: function() {
			modelThis = this;

			//current student data
			currentStudent = null;
			modelThis.progressPoints = null;
			modelThis.attemptedPoints = null;
			modelThis.progressVideoTime = null;
			modelThis.attemptedVideoTime = null;
			modelThis.lecturePointTotals = null;
			modelThis.lectureVideoTimeTotals = null;
			modelThis.visits = null;
			modelThis.avgTimePerDay = null;

			// add this information?
			modelThis.lastNode = null;

			//csv data
			modelThis.allProgress = null;
			modelThis.minutesPerDay = null;
			modelThis.problems = null;
			modelThis.problemAttempts = null;
			modelThis.videos = null;
			modelThis.videoViews = null;

			//parsed data
			modelThis.studentIds = [];
			modelThis.lectures = [];
			modelThis.details = null;
			modelThis.courseMap = null;

			//values to compute
			modelThis.possiblePoints = null;
			modelThis.possibleVideoTime = null;

			//need to compute this
			modelThis.medianDailyVisit = null;

			$( document ).ready(function() {

				$(".right.menu.open").on("click", function(e) {
					e.preventDefault();
					$(".ui.vertical.menu").toggle();
				});

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
					getData("data/all_progress.csv")
				
				).done(function(a, b, c, d, e, f) {

					modelThis.problems = processData(a[0]);
					modelThis.problemAttempts = processData(b[0]);
					modelThis.videos = processData(c[0]);
					modelThis.videoViews = processData(d[0]);
					modelThis.minutesPerDay = processData(e[0]);
					modelThis.allProgress = processData(f[0]);

					//parse and format minutesPerDay data to plot later
					modelThis.minutesPerDay.forEach(function(elem) {
						modelThis.studentIds.push(+elem.student_id);
						elem.student_id = +elem.student_id;
						elem.date = Date.parse(elem.date);
						elem.minutes_on_site = +elem.minutes_on_site;
					});


					modelThis.studentIds = d3.set(modelThis.studentIds)
						.values()
						.map(Number);

					//parse general problems data
					modelThis.details = d3.nest()
						.key(function(d) { return d.section; })
						.key(function(d) { return d.subsection; })
						.map(modelThis.problems);

					var _allProblems = [];

					for (var weekKey in modelThis.details) {
						
						var lectures = modelThis.details[weekKey];

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

					//parse general videos data
					modelThis.videos = d3.nest()
						.key(function(d) { return d.section; })
						.key(function(d) { return d.subsection; })
						.map(modelThis.videos);

					var _allVideos = [];

					for (var vidWeekKey in modelThis.videos) {
						
						var vidLectures = modelThis.videos[vidWeekKey];

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

					var detailsLength = modelThis.details.length;

					for (var i = 0; i < detailsLength; i++) {

						var thisWeek = modelThis.details[i].week;
						var thisLecture = modelThis.details[i].lecture;

						if (thisWeek === modelThis.videos[i].week && thisLecture === modelThis.videos[i].lecture) {

							modelThis.details[i]["videos"] = copyArray(modelThis.videos[i].videos);
							modelThis.details[i]["max_total_time"] = modelThis.videos[i].max_total_time;
						}
					}

					modelThis.possiblePoints = d3.sum(modelThis.problems,
						function(d) {
							return +d.max_points;
						});

					modelThis.possibleVideoTime = d3.sum(modelThis.videos, function(d) {
						return +d.max_total_time;
					});

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

					modelThis.courseMap = getCourseMap(modelThis.details);

					modelThis.details.forEach(function(elem) {
						if (elem.hasOwnProperty("lecture")) {
							var lectName = elem.lecture.replace(/\s+/g, '-');
							modelThis.lectures.push(lectName);
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
			model.currentStudent = studentId;
		},
		setPointsData : function(studentId) {
			var problems = modelThis.problemAttempts.filter(function(element) {
				return element.student_id == studentId;
			}, studentId);

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
			var videos = modelThis.videoViews.filter(function(element) {
				return element.student_id == studentId;
			}, studentId);

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
			var visits = modelThis.minutesPerDay.filter(function(element) {
				return element.student_id === +studentId;
			}, studentId);

			modelThis.visits = visits;
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
		getAvgTimePerDay : function(studentId) {
			return modelThis.avgTimePerDay;
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
		getPossiblePoints: function() {
			return modelThis.possiblePoints;
		},
		getPossibleVideoTime : function() {
			return modelThis.possibleVideoTime;
		},
		getDetails : function() {
			return modelThis.details;
		},
		getCurrentGrade : function() {
			var grade = Math.round(ctrl.getProgressPoints() / ctrl.getPossiblePoints() * 100);
			if (55 <= grade && grade <= 64) {
				grade += "% C";
			} else if (65 <= grade && grade <= 79) {
				grade += "% B";
			} else if (80 <= grade && grade <= 100) {
				grade += "% A";
			} else if (grade > 100) {
				grade += "% A+";
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
		}
	};

	var view = {
		init : function() {

			this.createDropDown();
			this.createDetailsTable();

			drawBarContainer("#progress-points-bar", 150, 30);
			drawBarContainer("#progress-video-time-bar", 150, 30);
			drawBarContainer("#total-points-bar", 150, 30);
			drawBarContainer("#total-video-time-bar", 150, 30);

			var lectures = ctrl.getLectures();

			for (var idx in lectures) {
				var elemId = "#" + lectures[idx];
				drawBarContainer(elemId, 150, 30);
				elemId += "-vid";
				drawBarContainer(elemId, 150, 30);
			}

			$(":input[name='currentStudent']").on("change", function() {
				ctrl.setCurrentStudent(this.value);
				ctrl.updateStudentData(this.value);
				view.render();
			});
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

			var weekRow = d3.select(".progress-details tbody")
				.selectAll("tr.week-row")
				.data(data)
				.enter()
				.append("tr")
				.attr("class", "week-row");

			weekRow.append("td")
				.attr("class", "week")
				.text(function(d) { return d.week; });

			weekRow.append("td")
				.attr("class", "lecture")
				.text(function(d) { return d.lecture; });

			weekRow.append("td")
				.attr("class", "problem-total")
				.attr("value", function(d) { return d.max_total_points; });

			weekRow.append("td")
				.attr("class", "problem-bar")
				.attr("id", function(d) { 
					return d.lecture.replace(/\s+/g, '-');
				});

			weekRow.each(function(d) {

				var current = d3.select(this).append("tr")
					.attr("class", "problem-set");

				var problemLength = d.problems.length;

				for (var i = 0; i < problemLength; i++) {

					current.append("td")
						.attr("class", "problem-id")
						.attr("id", d.problems[i].id)
						.text("0" + "/" + d.problems[i].max_points);
				}

			});

			weekRow.append("td")
				.attr("class", "video-total")
				.text(function(d) { return d.max_total_time; });

			weekRow.append("td")
				.attr("class", "video-bar")
				.attr("id", function(d) {
					var idName = d.lecture.replace(/\s+/g, '-');
					idName += "-vid";
					return idName;
				});
		},
		render : function() {
			d3.selectAll(".inner-rect").transition()
				.duration(500)
				.attr("width", 0)
				.remove();
			
			drawBar("#progress-points-bar", 150, 30, ctrl.getProgressPoints(), ctrl.getAttemptedPoints());
			
			drawBar("#progress-video-time-bar", 150, 30, ctrl.getProgressVideoTime(), ctrl.getAttemptedVideoTime());
			
			drawBar("#total-points-bar", 150, 30, ctrl.getProgressPoints(), ctrl.getPossiblePoints());
			
			drawBar("#total-video-time-bar", 150, 30, ctrl.getProgressVideoTime(), ctrl.getPossibleVideoTime());

			d3.select("#daily-time").text("~" + ctrl.getAvgTimePerDay() + " min");
			
			d3.select("#progress-points").text(ctrl.getProgressPoints() + " / " + ctrl.getAttemptedPoints());
			
			d3.select("#progress-video-time").text(formatTime(ctrl.getProgressVideoTime()));

			d3.select("#total-attempted-time").text(formatTime(ctrl.getAttemptedVideoTime()));
			
			d3.select("#total-points").text(ctrl.getProgressPoints() + " / " + ctrl.getPossiblePoints());
			
			d3.select("#total-video-time").text(formatTime(ctrl.getProgressVideoTime()));

			d3.select("#total-possible-time").text(formatTime(ctrl.getPossibleVideoTime()));
			
			d3.select("#current-grade").text(ctrl.getCurrentGrade());
		}
	};
	ctrl.init();
});