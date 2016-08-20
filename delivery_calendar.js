/**
 * 納期カレンダー生成
 * @charset "UTF-8"
 * @auth (c) 2014 ks.desk@gmail.com
 */
$(function(){
	/**
	 * $.workday		作業日数（default is 4）
	 * $.deliveryday	配送日数（default is 1）
	 * $.dayOff			定休の曜日及び祝日営業の有無を指定　[0:sunday, 1:monday, ..., 6:saturday, 7:祝日] 定休日は１、営業は０
	 * $.holiday		休業日の変更時に使用　{yyyy-mm-dd: 0|1} 休業日は１、営業日は０
	 */
	$.extend({
		"sc_ID": 'id_'+Math.round(Math.random()*100000),
		"sc_API": 'https://takahamalifeart.com/weblib/api/gadget.php',
		"schedule": {"order":"0000-00-00", "ship":"0000-00-00", "deli":"0000-00-00"},
		"workday": 4,
		"deliveryday": 1,
		"dayOff": [0,0,0,0,0,0,0,0],
		"holiday": {},
		getQueryStrung: function(){
		/**
		 * Query string の解析
		 * @return	{array} key:value
		 */
			var vars = {};
			var array = "";
			var hash = $('.schedule_calendar_wrap script:eq(0)').prop('src').match(/\?.+[=].+/g);
			if(hash!=null){
				array = hash[0].slice(1).split('&')[0].split('=');
				if(array[0]=='p') vars = JSON.parse(decodeURIComponent(array[1]));
			}
			return vars;
		},
		setScheduleParameter: function(args){
		/**
		 * プロパティ設定
		 */
			$.each(args, function(key, val){
				$[key] = val;
			});
		},
		updateCalendar: function(y,m){
			var isModify = 0;
			if($('.schedule_calendar tbody td .material-icons.is-selected').is('.is-appeared')){
				isModify = 1;
			}
			var today = $.getToday();
			if(m>12){
				y++;
				m = 1;
			}else if(m<1){
				y--;
				m = 12;
			}
			$.ajax({
				url:$.sc_API+'?callback=?', async:true, type:'GET', dataType:'jsonp', 
				data:{'act': 'delivery', 'y':y, 'm':m, 'orderdate':$.schedule.order, 'mode':isModify}
			}).done(function(r){
				var table = $("#"+$.sc_ID);
				$.each(r, function(key, val){
					var m = val.month-0;
					var tag = '<div class="flex-container">'+
							'<div><ins class="sc_year">'+val.year+'</ins><span>年</span><ins class="sc_month">'+val.month+'</ins><span>月</span></div>'+
							'<div class="mdl-layout-spacer"></div>' +
							'<div>'+
								'<button class="mdl-button mdl-js-button mdl-button--icon" onclick="$.updateCalendar('+val.year+','+(m-1)+');">'+
									'<i class="material-icons">&#xE408;</i>'+
								'</button>'+
								'<button class="mdl-button mdl-js-button" onclick="$.updateCalendar('+today.y+','+today.m+');"><span>今日</span></button>' +
								'<button class="mdl-button mdl-js-button mdl-button--icon" onclick="$.updateCalendar('+val.year+','+(m+1)+');">'+
									'<i class="material-icons">&#xE409;</i>'+
								'</button>'+
							'</div>'+
						'</div>';
					table.find("caption").html(tag);
					table.find("tbody").html(val.schedule.calendar).promise().done(function(){
						$.ripple();
					});
				});
			});
		},
		reschedule: function(y,m){
			if(arguments.length==3){
				orderdate = arguments[2];
			}else{
				orderdate = $.schedule.order;
			}
			var args = {'act':'delivery', 'y':y, 'm':m, 'orderdate':orderdate};
			$.ajax({
				url:$.sc_API+'?callback=?', async:true, type:'GET', dataType:'jsonp', data:args
			}).done(function(r){
				var table = $("#"+$.sc_ID);
				$.each(r, function(key, val){
					table.find("tbody").html(val.schedule.calendar).promise().done(function(){
						$.ripple();
					});
					$.schedule.order = val.schedule.order;
					$.schedule.ship = val.schedule.ship;
					$.schedule.deli = val.schedule.delivery;
				});
				// スケジュール表示
				$.setSchedule();
			});
		},
		ripple: function(){
			var ink, d, x, y;
			$(".ripplable").on("click", function(e){
				// 休日指定モードの場合
				var self = $(this);
				if(self.children('.material-icons').is('.is-appeared')){
					$.switchHoliday(self);
					return false;
				}
				//create .ink element if it doesn't exist
				if(self.find(".ink").length === 0){
					self.prepend("<span class='ink'></span>");
				}
				
				//incase of quick double clicks stop the previous animation
				ink = self.find(".ink");
				ink.removeClass("animate");
				
				//set size of .ink
				if(!ink.height() && !ink.width()){
					//use this width or height whichever is larger for the diameter to make a circle which can cover the entire element.
					d = Math.max($(this).outerWidth(), self.outerHeight());
					ink.css({height: d, width: d});
				}
				
				//get click coordinates
				//logic = click coordinates relative to page - this position relative to page - half of self height/width to make it controllable from the center;
				x = e.pageX - self.offset().left - ink.width()/2;
				y = e.pageY - self.offset().top - ink.height()/2;
				
				//set the position and add class .animate
				var table = $("#"+$.sc_ID);
				var year = table.find(".sc_year").text();
				var month = table.find(".sc_month").text();
				var day = self.children('ins').text();
				var orderMonth = month;
				var orderYear = year;
				if(self.hasClass("pass")){
					if(month==1){
						--orderYear;
						orderMonth = 12;
					}else{
						--orderMonth;
					}
				}else if(self.hasClass("yet")){
					if(month==12){
						++orderYear;
						orderMonth = 1;
					}else{
						++orderMonth;
					}
				}
				var orderdate = orderYear+"-"+orderMonth+"-"+day;
				ink.css({top: y+'px', left: x+'px'}).addClass("animate").promise().done(function(){
					$.reschedule(year, month, orderdate);
				});
			});
		},
		switchHoliday: function(obj){
		/**
		 * 休業指定の切替
		 */
			var table = $("#"+$.sc_ID);
			var year = table.find(".sc_year").text();
			var month = table.find(".sc_month").text();
			var curr = obj.find('.is-selected');
			var day = curr.removeClass('is-selected is-appeared').siblings('.material-icons').addClass('is-selected is-appeared').siblings('ins').text();
			var date = $.formatDate(year+'-'+month+'-'+day, 'YYYY-MM-DD');
			$.holiday[date] = curr.is('.dayoff')? 0: 1;
		},
		updateUser: function(){
			var args = {
				"user_id": "0",
				"workday": $.workday,
				"deliveryday": $.deliveryday,
				'onsundays': $.dayOff[0],
				'onmondays': $.dayOff[1],
				'ontuesdays': $.dayOff[2],
				'onwednesdays': $.dayOff[3],
				'onthursdays': $.dayOff[4],
				'onfridays': $.dayOff[5],
				'onsaturdays': $.dayOff[6],
				'onholidays': $.dayOff[7],
				'holiday': JSON.stringify($.holiday)
			};
			$.ajax({
				url:$.sc_API+'?callback=?', async:true, type:'GET', dataType:'jsonp', data:{'act':'update', 'args':args}
			}).done(function(r){
				var table = $("#"+$.sc_ID);
				var year = table.find(".sc_year").text();
				var month = table.find(".sc_month").text();
				$.reschedule(year, month);
			});
		},
		getToday: function(){
			var today = new Date();
			var y = today.getFullYear();
			var m = today.getMonth()+1;
			var d = today.getDate();
			return {'y':y, 'm':m, 'd':d};
		},
		formatDate: function (date, format) {
		/**
		 * 日付フォーマット
		 * @date	{string} 日付
		 * @format	{string} フォーマット
		 * return	日付文字列
		 */
			date = new Date(date);
			if (!format) format = 'YYYY-MM-DD hh:mm:ss.SSS';
			format = format.replace(/YYYY/g, date.getFullYear());
			format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
			format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
			format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
			format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
			format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
			if (format.match(/S/g)) {
				var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
				var length = format.match(/S/g).length;
				for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
			}
			return format;
		}
	});
	
	(function($) {
		var today = $.getToday();
		/*
		var qs = $.getQueryStrung();
		if(Object.keys(qs).length>0){
			$.setScheduleParameter(qs);
		}
		var whereIs = {"1":["=", _ME]};
		$.getJSON($.sc_API+'?callback=?', {'act':'table', 'output':'jsonp', 'name':'users', 'where':whereIs}).then(function(r){
		*/
		$.when(
			$.ajax({ url:$.sc_API+'?callback=?', async:true, type:'GET', dataType:'jsonp', data:{'act': 'delivery'} })
		).then(function(r){
			var tag = '';
			$.each(r, function(key, val){
				var m = val.month-0;
	        	tag += '<table class="schedule_calendar">'+
					'<caption>'+
						'<div class="flex-container">'+
							'<div><ins class="sc_year">'+val.year+'</ins><span>年</span><ins class="sc_month">'+val.month+'</ins><span>月</span></div>'+
							'<div class="mdl-layout-spacer"></div>' +
							'<div>'+
								'<button class="mdl-button mdl-js-button mdl-button--icon" onclick="$.updateCalendar('+val.year+','+(m-1)+');">'+
									'<i class="material-icons">&#xE408;</i>'+
								'</button>'+
								'<button class="mdl-button mdl-js-button" onclick="$.updateCalendar('+today.y+','+today.m+');"><span>今日</span></button>' +
								'<button class="mdl-button mdl-js-button mdl-button--icon" onclick="$.updateCalendar('+val.year+','+(m+1)+');">'+
									'<i class="material-icons">&#xE409;</i>'+
								'</button>'+
							'</div>'+
						'</div>'+
					'</caption>'+
					'<thead>'+
						'<tr>'+
							'<td class="sun">日</td>'+
							'<td>月</td>'+
							'<td>火</td>'+
							'<td>水</td>'+
							'<td>木</td>'+
							'<td>金</td>'+
							'<td class="sat">土</td>'+
						'</tr>'+
					'</thead>'+
					'<tbody>'+val.schedule.calendar+'</tbody>'+
				'</table>';
				
				$.schedule.order = val.schedule.order;
				$.schedule.ship = val.schedule.ship;
				$.schedule.deli = val.schedule.delivery;
				$.workday = val.schedule.workday;
				$.deliveryday = val.schedule.deliveryday;
				$.dayOff = val.schedule.dayoff;
			});
			$('head').append('<link>');
			var css = $('head link:last');
			css.attr({
			    rel: 'stylesheet',
			    type: 'text/css',
			    media: 'screen',
			    href: 'http://takahamalifeart.com/weblib/calendar/delivery_calendar.css'
			});
			$('.schedule_calendar_wrap').attr('id',$.sc_ID).html(tag).promise().done(function(){
				$.ripple();
				if(typeof $.setSchedule == 'function' ) $.setSchedule();
				if(typeof $.setHolidaySetting == 'function' ) $.setHolidaySetting();
			});
		});
	})(jQuery);
});

