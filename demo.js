/*
 * QuickBlox Web XMPP Chat sample
 * version 1.2.5
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var login, password;

// Test users
var TESTUSERS = {
                        id1         : '298',
                        login1      : 'bobbobbob',
                        password1   : 'bobbobbob',
                        id2         : '299',
                        login2      : 'samsamsam',
                        password2   : 'samsamsam',
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
	var params = {login: login, password: password};
	
	connect(params); // qb_signalling.js
}

function onConnectionFailed(error) {
    console.log('onConnectionFailed: ' + error);
 
	$('#connecting, #chat').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function onConnectionSuccess() {
    console.log('onConnectionSuccess');
    
    $('#connecting').hide();
    $('#webrtc').show();
}

function onConnectionDisconnected(){
    console.log('onConnectionDisconnected');
    
    $('.chat-content').html('');
    $('#chat, #qb_login_form').hide().prevAll('#auth, #buttons').show();
}

function onCall(fromUserID){
    console.log('onCall: ' + fromUserID);
    
    accept(fromUserID);
}

function onAccept(fromUserID){
    console.log('onAccept: ' + fromUserID);
}

function callToUser(){
   call(opponentID);
}
