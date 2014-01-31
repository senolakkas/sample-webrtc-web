/*
 * QuickBlox WebRTC Sample
 * version 0.1
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

var myName, opponentName;
var opponentUserID;

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
});

/*
 * Actions 
 */
function authQB(user) {
    $('#auth').hide().next('#connecting').show();
	$('#wrap').addClass('connect_message');
	
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
	var params = {login: login, password: password};
	
	connect(params); // qb_signalling.js
}

function callToUser(){
   call(opponentID);
}

function acceptCall(){
    accept(opponentUserID);
    
    startSetupConnection();
}

function rejectCall(){
    reject(opponentUserID);
    
    $('#incomingCallControls').hide();
        
    $('#incomingCallAudio')[0].pause()
}

/*
 * Signalling 
 */
function onConnectionFailed(error) {
    console.log('onConnectionFailed: ' + error);
 
	$('#connecting, #chat').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function onConnectionSuccess(user_id) {
    console.log('onConnectionSuccess');
    
    
    $('#connecting').hide();
    $('#webrtc').show();
    
    $('#localVideoContainer').show();
    $('#callToUserButton').show();
    $('#currentUserName').text(myName);
    $('#callToUserButton').text('Call to ' + opponentName);
    
    $('#localVideoContainer').show();
    $('#remoteVideoContainer').show();
    
    // start local video
    var localVideo = document.getElementById("localVideo");
    webrtcGetUserMedia(localVideo);
}

function onConnectionDisconnected(){
    console.log('onConnectionDisconnected');
    
    $('.chat-content').html('');
    $('#chat, #qb_login_form').hide().prevAll('#auth, #buttons').show();
}

function onCall(fromUserID){
    console.log('onCall: ' + fromUserID);
    
    $('#incomingCallControls').show();
    
    $('#incomingCallAudio')[0].play();
    
    opponentUserID = fromUserID;
}

function onAccept(fromUserID){
    console.log('onAccept: ' + fromUserID);
    
    startSetupConnection();
}

function onReject(fromUserID){
    console.log('onReject: ' + fromUserID);
    
    alert("Call rejected");
}

function onOffer(fromUserID, description){
    console.log('onOffer: ' + fromUserID + ', description: ' + description);
}

function onAnswer(fromUserID, description){
    console.log('onAnswer: ' + fromUserID + ', description: ' + description);
}

function onCandidate(fromUserID, candidate){
    console.log('onCandidate: ' + fromUserID + ', candidate: ' + candidate);
}

function onStop(fromUserID, reason){
    console.log('onStop: ' + fromUserID + ', reason: ' + reason);
}

/*
 * WebRTC methods 
 */
function startSetupConnection(){
    createPeerConnection();
}
