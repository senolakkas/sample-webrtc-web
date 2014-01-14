/*
 * QuickBlox Web XMPP Chat sample
 * version 1.2.5
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var login, password, params, connection, userJID, opponentJID, opponentID;

// QB Account params
var QBPARAMS = {
                        app_id      : '92',
                        auth_key    : 'wJHdOcQSxXQGWx5',
                        auth_secret : 'BTFsj7Rtt27DAmT'
}

// Test users
var TESTUSERS = {
                        id1         : '298',
                        login1      : 'bobbobbob',
                        password1   : 'bobbobbob',
                        id2         : '299',
                        login2      : 'samsamsam',
                        password2   : 'samsamsam',
}

//Chat params
var CHAT = {
                        server      : 'chat.quickblox.com',
                        bosh_url    : 'http://chat.quickblox.com:5280'
}

// Widget settings
var WIDGET_WIDTH = $('body').width();
var WIDGET_HEIGHT = $('body').height();

/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
	$.ajaxSetup({ cache: true });
	
	$('#auth').show();
	//
	$('#connecting').hide();
	//
	$('#webrtc').hide();
    //$('#callIncoming').hide();
    //$('#userVideo').hide();
    //$('#recipientVideoContainer').hide();
    
    
    $("#acceptCall").click(function() {
		document.getElementById("ring").pause();
		$(".delay").fadeIn(200);
		setTimeout(function(){$("#callIncoming").addClass("hidden")}, 3000);
		setTimeout(function(){callActive = true; callTimer()}, 3000);
		setTimeout(function(){$("#callIncoming").hide()}, 4000);
		setTimeout(function(){$(".activeCallControls").fadeIn(500)}, 4000);
	});
	$("#hangUp").click(function() {
		recipientVideo.stop();
	});
});

function authQB(user) {
    sessionCreate(user);
}

function sessionCreate(user) {
	$('#auth').hide().next('#connecting').show();
	$('#wrap').addClass('connect_message');
	
	if (user == 1) {
		login = TESTUSERS.login1;
		password = TESTUSERS.password1;
		
		opponentID = TESTUSERS.id2;
	} else {
		login = TESTUSERS.login2;
		password = TESTUSERS.password2;
		
		opponentID = TESTUSERS.id1;
	}
	params = {login: login, password: password};
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err.detail);
			connectFailed();
		} else {
			console.log(result);
			
			QB.login(params, function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err.detail);
					connectFailed();
				} else {
					console.log(result);
					
					xmppConnect(result.id, password);
				}
			});
		}
	});
}

function xmppConnect(user_id, password) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	connection.addHandler(onMessage, null, 'message', null, null,  null); 
 
	console.log(connection);

	userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	opponentJID = opponentID + "-" + QBPARAMS.app_id + "@" + CHAT.server
	
	connection.connect(userJID, password, function (status) {
		switch (status) {
		case Strophe.Status.ERROR:
		    console.log('[Connection] Error');
		    break;
		case Strophe.Status.CONNECTING:
			console.log('[Connection] Connecting');
			break;
		case Strophe.Status.CONNFAIL:
		    console.log('[Connection] Failed to connect');
		    connectFailed();
		    break;
		case Strophe.Status.AUTHENTICATING:
		    console.log('[Connection] Authenticating');
		    break;
		case Strophe.Status.AUTHFAIL:
		    console.log('[Connection] Unauthorized');
		    connectFailed();
		    break;
		case Strophe.Status.CONNECTED:
		    console.log('[Connection] Connected');
		    connectSuccess();
			
			/*Connected */
			
		    break;
		case Strophe.Status.DISCONNECTED:
		    console.log('[Connection] Disconnected');
		    break;
		case Strophe.Status.DISCONNECTING:
		    console.log('[Connection] Disconnecting');
		  
		    $('.chat-content').html('');
			$('#chat, #qb_login_form').hide().prevAll('#auth, #buttons').show();
		    break;
		case Strophe.Status.ATTACHED:
		    console.log('[Connection] Attached');
		    break;
		}
	});
}

function rawInput(data) {
    console.log('RECV: ' + data);
}

function rawOutput(data) {
    console.log('SENT: ' + data);
}

function onMessage(msg) {
    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');

    if (type == "chat" && elems.length > 0) {
        var body = elems[0];

        log('I got a message from ' + from + ': ' + Strophe.getText(body));
    }

    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

function connectFailed() {
	$('#connecting, #chat').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function connectSuccess() {
    $('#connecting').hide();
    $('#webrtc').show();
}



function callToUser() {
   //opponentID
   
    var reply = $msg({to: opponentJID, 
                     from: userJID, 
                     type: 'chat'})
            .cnode(Strophe.xmlElement('body', "hello man"));
        
    connection.send(reply);
}


var callActive = false;
var elapsedTime;
var minutesLabel = document.getElementById("minutes");
var secondsLabel = document.getElementById("seconds");
var totalSeconds = 0;

function callTimer() {
	var elapsedTime = setInterval(setTime, 1000);
}

function setTime() {
	if(callActive) {
	    ++totalSeconds;
	    secondsLabel.innerHTML = pad(totalSeconds%60);
	    minutesLabel.innerHTML = pad(parseInt(totalSeconds/60));
    } else {
	    clearInterval(elapsedTime);
    }
}

function pad(val) {
    var valString = val + "";
    if(valString.length < 2) {
        return "0" + valString;
    }
    else {
        return valString;
    }
}

// the container element is where the video is appended
var recipientVideo = new SayCheese('#recipientVideoContainer', { snapshots: false });

recipientVideo.on('start', function() { 

	// this stuff starts when user 2 turns on their camera (recipient)
	
    $("#recipientVideoContainer video").addClass("recipient-video");
    
    var videoClass = $(".recipient-video");
    
    videoClass.attr("height", jQuery(window).height());
    
    jQuery(window).resize(function () {
    	videoClass.attr("height", jQuery(window).height());
    });
    
});

recipientVideo.on('stop', function() {

		// this stuff happens when you end the call (click the end call button basically)
		
		$(".recipient-video").get(0).pause();
		$("#recipientVideoContainer").addClass("videoEnded");
		setTimeout(function(){$("#callEndedContent").fadeIn(300)}, 2000);
		userVideo.stop();
		callActive = false;
});

recipientVideo.start();

var userVideo = new SayCheese('#userVideo', { snapshots: false });

userVideo.on('start', function() { 
	
	// this stuff starts when user 1 turns on their camera (you)
	
	$("#userVideo video").addClass("user-video");
	
	$(".user-video").hide();
	setTimeout(function(){$(".user-video").fadeIn(500)}, 1000)
	
});

userVideo.on('stop', function() {
		$("#userVideo").hide();
});

userVideo.start();

// make the your video preview draggable (user 1)

(function($) {
    $.fn.drags = function(opt) {

        opt = $.extend({handle:"",cursor:"move"}, opt);

        if(opt.handle === "") {
            var $el = this;
        } else {
            var $el = this.find(opt.handle);
        }

        return $el.css('cursor', opt.cursor).on("mousedown", function(e) {
            if(opt.handle === "") {
                var $drag = $(this).addClass('draggable');
            } else {
                var $drag = $(this).addClass('active-handle').parent().addClass('draggable');
            }
            var z_idx = $drag.css('z-index'),
                drg_h = $drag.outerHeight(),
                drg_w = $drag.outerWidth(),
                pos_y = $drag.offset().top + drg_h - e.pageY,
                pos_x = $drag.offset().left + drg_w - e.pageX;
            $drag.css('z-index', 1000).parents().on("mousemove", function(e) {
                $('.draggable').offset({
                    top:e.pageY + pos_y - drg_h,
                    left:e.pageX + pos_x - drg_w
                }).on("mouseup", function() {
                    $(this).removeClass('draggable').css('z-index', z_idx);
                });
            });
            e.preventDefault(); // disable selection
        }).on("mouseup", function() {
            if(opt.handle === "") {
                $(this).removeClass('draggable');
            } else {
                $(this).removeClass('active-handle').parent().removeClass('draggable');
            }
        });

    }
    
    $('#userVideo').drags();
})(jQuery);

