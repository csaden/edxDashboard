$(function() {

	var model = {

		init: function() {

			var modelThis = this;
			var currentStudent = null;
			var minutesPerDay,
				problems,
				problem_attempts,
				videos,
				video_views;

			$( document ).ready(function() {

				createDropDown();

				$.when(

					getData("data/minutes_per_day.csv"),
					getData("data/problems.csv"),
					getData("data/problem_attempts.csv"),
					getData("data/videos.csv"),
					getData("data/video_views.csv")
				
				).done(function(a, b, c, d, e) {

					modelThis.minutesPerDay = processData(a[0]);
					modelThis.problems = processData(b[0]);
					modelThis.problem_attempts = processData(c[0]);
					modelThis.videos = processData(d[0]);
					modelThis.video_views = processData(e[0]);

				});

				$(".ui.dropdown").dropdown();

			});
		}
	};

	var controller = {

		getRecordName : function(record) {
			return record.id;
		}

		updateDashboard : function(record) {
			$(":input[name='currentStudent']").on("change", function() {
			//filter data
			//update the views
			console.log(this.value);
});
		}
	};

	var view = {

	};

	controller.init()
});
