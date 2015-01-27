$(function() {

	var model = {


		init: function() {

			modelThis = this;

			modelThis.currentStudent = null;

			//csv data
			modelThis.studentIds = [];
			modelThis.students = null;
			modelThis.minutesPerDay = null;
			modelThis.problems = null;
			modelThis.problemAttempts = null;
			modelThis.videos = null;
			modelThis.videoViews = null;

			//computer totals
			modelThis.totalPoints = null;
			modelThis.totalVideoTime = null;

			//computed data from all students
			modelThis.videoProgress = null;

			$( document ).ready(function() {

				modelThis.createDropDown();

				$.when(

					getData("data/problems.csv"),
					getData("data/problem_attempts.csv"),
					getData("data/videos.csv"),
					getData("data/video_views.csv")
				
				).done(function(a, b, c, d) {

					modelThis.problems = processData(a[0]);
					modelThis.problemAttempts = processData(b[0]);
					modelThis.videos = processData(c[0]);
					modelThis.videoViews = processData(d[0]);


					modelThis.totalPoints = d3.sum(modelThis.problems,
						function(d) {
							return d.max_points;
						});

					modelThis.videoProgress = d3.nest()
						.key(function(d) { return d.student_id; })
						.rollup(function(d) {
							return {
								"watched_seconds" : d3.sum(d, function(g) {
									return g.watched_seconds;
								}),
								"duration_seonds" : d3.sum(d, function(g) {
									return g.duration_seconds;
								})
							};
						}).entries(modelThis.videoViews);

					modelThis.createProblemTable();
					modelThis.createVideoTable();

				});

				$(".ui.dropdown").dropdown();
			});
		},

		createDropDown : function() {

			//read in minutes data
			d3.csv('data/minutes_per_day.csv', function(d) {

				modelThis.studentIds.push(+d.student_id);

				return {
							"id"			: +d.student_id,
							"date"			: Date.parse(d.date),
							"time_on_site"	: +d.minutes_on_site
				};

			}, function(error, rows) {

				modelThis.minutesPerDay = rows;

				modelThis.studentIds = d3.set(modelThis.studentIds).values().map(Number);

				//bind students to drop down
				var dropdown = d3.select('#students');

				dropdown.selectAll('item.student')
					.data(modelThis.studentIds)
					.enter()
					.append('div')
					.attr('class', 'item')
					.attr('data-value', function(d) { return d; })
					.text(function(d) { return 'Student ' + d; })
					.html(function(d) {
						return '<i class="user icon"></i>Student ' + d;
				});
			});
		},

		createProblemTable : function() {

			modelThis.problems = d3.nest()
				.key(function(d) { return d.section; })
				.key(function(d) { return d.subsection; })
				.map(modelThis.problems);

			var allProblems = [];

			for (var weekKey in modelThis.problems) {
				
				var lectures = modelThis.problems[weekKey];

				for (var lectureKey in lectures) {

					newObject = {};

					newObject["week"] = weekKey;
					newObject["lecture"] = lectureKey;
					newObject["problems"] = lectures[lectureKey];
					newObject["max_total_points"] = d3.sum(lectures[lectureKey], function(d) { return d.max_points; });
					allProblems.push(newObject);
				}
			}

			modelThis.problems = allProblems;

			var weekRow = d3.select("#problem-details")
				.selectAll("div.week-row")
				.data(modelThis.problems)
				.enter()
				.append("div")
				.attr("class", "week-row");

			weekRow.append("div")
				.attr("class", "week")
				.text(function(d) { return d.week; });

			weekRow.append("div")
				.attr("class", "lecture")
				.text(function(d) { return d.lecture; });

			weekRow.append("div")
				.attr("class", "lecture-total")
				.text(function(d) { return d.max_total_points; });

			weekRow.each(function(d) {

				var current = d3.select(this).append("div")
					.attr("class", "problem-set");

				for (var i=0; i <= d.problems.length - 1; i++) {

					current.append("div")
						.attr("class", "problem-id")
						.attr("id", d.problems[i].id)
						.text("0" + "/" + d.problems[i].max_points);
				}

			});
		},

		createVideoTable : function() {

			modelThis.videos = d3.nest()
				.key(function(d) { return d.section; })
				.key(function(d) { return d.subsection; })
				.map(modelThis.videos);

			var allVideos = [];

			for (var weekKey in modelThis.videos) {
				
				var lectures = modelThis.videos[weekKey];

				for (var lectureKey in lectures) {

					newObject = {};

					newObject["week"] = weekKey;
					newObject["lecture"] = lectureKey;
					newObject["videos"] = lectures[lectureKey];
					newObject["max_total_time"] = d3.sum(lectures[lectureKey], function(d) {
						return d.duration_seconds;
					});
					allVideos.push(newObject);
				}
			}

			modelThis.videos = allVideos;

			console.log(modelThis.videos);

			var weekRow = d3.select("#video-details")
				.selectAll("div.video-row")
				.data(modelThis.videos)
				.enter()
				.append("div")
				.attr("class", "video-row");

			weekRow.append("div")
				.attr("class", "video-lecture")
				.text(function(d) { return d.lecture; });

			weekRow.append("div")
				.attr("class", "video-total-time")
				.text(function(d) { return d.max_total_time; });

			weekRow.append("div")
				.attr("class", "ui tiny progress video-progress")
				.append("div")
				.attr("class", "bar")
				.append("div")
				.attr("progress");
		}

	};

	var controller = {

		init : function() {
			model.init();
			view.init();
		},

		setCurrentStudent : function(student) {
			model.currentStudent = student;
		},

		getCurrentStudent : function() {
			return model.currentStudent;
		},

		getRecordName : function(record) {
			return record.id;
		},

		updateSummary : function(student) {

		},

		updateDetailTable : function(student) {

		},

		updateAction : function(student) {

		},

		updateDashboard : function() {

		}

	};

	var view = {

		init : function() {

			$(":input[name='currentStudent']").on("change", function() {
				
				controller.setCurrentStudent(this.value);
				console.log(this.value);
				
				//retrieve data

				//update the view
				view.render();
			
			});

		},

		render : function() {

		}

	};

	controller.init();
});
