/*
 * QuickBlox WebRTC Sample
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

var myName, opponentName;
var opponentID;

// Test users
var TESTUSERS = {
                        id1         : '298',
                        login1      : 'bobbobbob',
                        password1   : 'bobbobbob',
                        name1       : 'Bob',
                        id2         : '299',
                        login2      : 'samsamsam',
                        password2   : 'samsamsam',
                        name2       : 'Sam',
}

// Widget settings
var WIDGET_WIDTH = $('body').width();
var WIDGET_HEIGHT = $('body').height();

var localVideo, remoteVideo;

var videoChatSignaling;
var videoChat;


/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
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
	
	localVideo = document.getElementById("localVideo");
	remoteVideo = document.getElementById("remoteVideo");
});

/*
 * Actions 
 */
function login(user) {
    $('#auth').hide().next('#connecting').show();
	$('#wrap').addClass('connect_message');

	
	// Create signaling instance
	//
	videoChatSignaling = new QBVideoChatSignaling();
	
	// set callbacks
	videoChatSignaling.addOnConnectionSuccessCallback(onConnectionSuccess);
	videoChatSignaling.addOnConnectionFailed(onConnectionFailed);
	videoChatSignaling.addOnConnectionDisconnected(onConnectionDisconnected);
	videoChatSignaling.addOnCall(onCall);
	videoChatSignaling.addOnAccept(onAccept);
	videoChatSignaling.addOnReject(onReject);
	videoChatSignaling.addOnCandidate(onCandidate);
	
	// Login To Chat
	//
	var login, password;
	if (user == 1) {
		login = TESTUSERS.login1;
		password = TESTUSERS.password1;
		
		myName = TESTUSERS.name1;
		opponentName = TESTUSERS.name2;
		
		opponentID = TESTUSERS.id2;
	} else {
		login = TESTUSERS.login2;
		password = TESTUSERS.password2;
		
		myName = TESTUSERS.name2;
		opponentName = TESTUSERS.name1;
		
		opponentID = TESTUSERS.id1;
	}
	//
	var params = {login: login, password: password};
	videoChatSignaling.login(params);
}

function callToUser(){
	videoChat.call(opponentID);
}

function acceptCall(){    
    videoChat.accept(opponentID);
    
    $('#incomingCallControls').hide();
    $('#incomingCallAudio')[0].pause();
    $('#remoteVideoContainer').show();
}

function rejectCall(){
    videoChat.reject(opponentID);
    
    $('#incomingCallControls').hide();
    $('#incomingCallAudio')[0].pause()
}

/*
 * Signalling callbacks
 */
function onConnectionSuccess(user_id) {
   	traceM('onConnectionSuccess');
    
    $('#connecting').hide();
    $('#webrtc').show();
    
    $('#localVideoContainer').show();
    $('#callToUserButton').show();
    $('#currentUserName').text(myName);
    $('#callToUserButton').text('Call to ' + opponentName);
    
    $('#localVideoContainer').show();
    $('#remoteVideoContainer').show();
    
    // Create video chat instance
    videoChat = new QBVideoChat(localVideo, remoteVideo, 
							{video: true, audio: false}, videoChatSignaling);
}

function onConnectionFailed(error) {
    traceM('onConnectionFailed: ' + error);
 
	$('#connecting, #chat').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function onConnectionDisconnected(){
    traceM('onConnectionDisconnected');
    
    $('.chat-content').html('');
    $('#chat, #qb_login_form').hide().prevAll('#auth, #buttons').show();
}

function onCall(fromUserID, sessionDescription, sessionID){
    traceM('onCall: ' + fromUserID);
    
    videoChat.sessionID = sessionID;
    videoChat.potentialRemoteSessionDescription = sessionDescription;
    
    $('#incomingCallControls').show();
    $('#incomingCallAudio')[0].play();
}

function onAccept(fromUserID, sessionDescription, sessionID){
    traceM('onAccept: ' + fromUserID);
    
    videoChat.setRemoteDescription(sessionDescription, "answer"); //TODO: refactor this (hide)
}

function onReject(fromUserID){
    traceM('onReject: ' + fromUserID);
    
    alert("Call rejected");
}

function onCandidate(fromUserID, candidate){
	traceM('onCandidate ' + JSON.stringify(candidate));
	
    videoChat.addCandidate(candidate);
}

function onStop(fromUserID, reason){
    traceM('onStop: ' + fromUserID + ', reason: ' + reason);
    
    videoChat = null;
}


/*
 * Helpers 
 */
function traceM(text) {
 	 console.log("[main]: " + text);
}
