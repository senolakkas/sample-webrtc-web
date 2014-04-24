var params, chatUser, chatService, recipientID;
var signaling, videoChat, popups = {};
var isPopupClosed = true;

var audio = {
	ring: $('#ring')[0]
};

$(document).ready(function() {
	// Web SDK initialization
	QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
	
	// QuickBlox session creation
	QB.createSession(function(err, result) {
		if (err) {
			console.log(err.detail);
		} else {
			$('#loginForm').modal({
				backdrop: 'static',
				keyboard: false
			});
			
			$('.tooltip-title').tooltip();
			
			// events
			$('#loginForm button').click(login);
			$('#logout').click(logout);
			$('#doCall').click(createVideoChatInstance);
			$('#stopCall').click(stopCall);
		}
	});
});

function login() {
	$('#loginForm button').hide();
	$('#loginForm .progress').show();
	
	params = {
		login: $(this).val(),
		password: '123123123' // default password
	};
	
	// chat user authentication
	QB.login(params, function(err, result) {
		if (err) {
			onConnectFailed();
			console.log(err.detail);
		} else {
			chatUser = {
				id: result.id,
				login: params.login,
				pass: params.password
			};
			
			connectChat();
		}
	});
}

function connectChat() {
	// set parameters of Chat object
	params = {
		onConnectFailed: onConnectFailed,
		onConnectSuccess: onConnectSuccess,
		onConnectClosed: onConnectClosed,

		debug: false
	};
	
	chatService = new QBChat(params);
	
	// connect to QB chat service
	chatService.connect(chatUser);
}

function logout() {
	stopCall();
	chatService.disconnect();
}

function createSignalingInstance() {
	// set parameters of Signaling object
	params = {
		onCallCallback: onCall,
		onAcceptCallback: onAccept,
		onRejectCallback: onReject,
		onStopCallback: onStop,

		debug: false
	};
	
	signaling = new QBVideoChatSignaling(chatService, params);
}

function createVideoChatInstance(event, sessionID, sessionDescription) {
	var name = chooseOpponent(chatUser.login);
	
	// set parameters of videoChat object
	params = {
		sessionID: sessionID,
		sessionDescription: sessionDescription,
		
		constraints: {audio: true, video: true},
		
		onGetUserMediaSuccess: function() {
			getMediaSuccess(recipientID, name, sessionID)
		},
		
		onGetUserMediaError: function() {
			getMediaError(recipientID)
		},

		debug: false
	};
	
	videoChat = new QBVideoChat(signaling, params);
	
	// set access to user media devices
	videoChat.getUserMedia();
}

function doCall() {
	$('#doCall').hide();
	$('#stopCall').show();
	videoChat.call(recipientID, chatUser.login);
}

function acceptCall() {
	var name, sessionDescription, sessionID;
	
	name = $(this).data('name');
	sessionID = $(this).data('id');
	sessionDescription = $(this).data('description');
	
	isPopupClosed = false;
	popups['remoteCall' + recipientID].close();
	delete popups['remoteCall' + recipientID];
	
	stopRing(popups);
	createVideoChatInstance(null, sessionID, sessionDescription);
}

function rejectCall(sessionID) {
	isPopupClosed = false;
	popups['remoteCall' + recipientID].close();
	delete popups['remoteCall' + recipientID];
	
	stopRing(popups);
	videoChat.reject(recipientID, chatUser.name);
}

function stopCall() {
	$('#stopCall').hide().parent().find('#doCall').show();
	videoChat.stop(recipientID, chatUser.name);
	videoChat.hangup();
	videoChat.signaling = null;
	videoChat = null;
	
	$('video').attr('src', '');
	$('#localVideo').show();
	$('#remoteVideo, #miniVideo').hide();
}

/* Callbacks
----------------------------------------------------------*/
function onConnectFailed() {
	$('#loginForm .progress').hide();
	$('#loginForm button').show();
}

function onConnectSuccess() {
	var opponent = chooseOpponent(chatUser.login);
	recipientID = users[opponent];
	
	$('#loginForm').modal('hide');
	$('#wrap').show();
	$('#videochat-footer .opponent').text(opponent);
	createSignalingInstance();
	
	// create a timer that will send presence each 60 seconds
	chatService.startAutoSendPresence(60);
}

function onConnectClosed() {
	$('#wrap').hide();
	$('#loginForm').modal('show');
	$('#loginForm .progress').hide();
	$('#loginForm button').show();
	
	chatUser = null;
	chatService = null;
	signaling = null;
	videoChat = null;
}

function getMediaSuccess(qbID, name, sessionID) {
	$('#doCall, #stopCall').attr('data-qb', qbID);
	if (sessionID)
		$('#doCall').hide().parent().find('#stopCall').show();
	
	videoChat.localStreamElement = $('#localVideo')[0];
	videoChat.remoteStreamElement = $('#remoteVideo')[0];
	videoChat.attachMediaStream(videoChat.localStreamElement, videoChat.localStream);
	
	if (sessionID) {
		getRemoteStream();
		videoChat.accept(qbID, chatUser.login);
	} else {
		doCall();
	}
}

function getMediaError(qbID) {
	videoChat.reject(qbID, chatUser.login);
}

function onCall(qbID, sessionDescription, sessionID, name, avatar) {
	var win, selector, winName = 'remoteCall' + qbID;
	
	if (popups[winName]) {
		popups[winName].close();
		delete popups[winName];
	}
	
	popups[winName] = openPopup(winName, {width: 250, height: 280});
	win = popups[winName];
	
	win.onload = function() {
		selector = $(win.document);
		selector.find('#acceptCall').click(acceptCall);
		selector.find('#rejectCall').click(function() {rejectCall(qbID, sessionID)});
		
		htmlRemoteCallBuilder(selector, qbID, sessionDescription, sessionID, avatar, name);
		audio.ring.play();
		
		win.onbeforeunload = function() {
			if (isPopupClosed)
				rejectCall(qbID, sessionID);
			isPopupClosed = true;
		};
	};
}

function onAccept(qbID) {
	getRemoteStream();
}

function onReject(qbID) {
	$('#stopCall').hide().parent().find('#doCall').show();
}

function onStop(qbID) {
	$('#stopCall').hide().parent().find('#doCall').show();
	videoChat.hangup();
	videoChat.signaling = null;
	videoChat = null;
	
	$('video').attr('src', '');
	$('#localVideo').show();
	$('#remoteVideo, #miniVideo').hide();
	
	var win = popups['remoteCall' + qbID];
	if (win) {
		isPopupClosed = false;
		win.close();
		delete popups['remoteCall' + qbID];
		
		stopRing(popups);
	}
}

/* Helpers
----------------------------------------------------------*/
function chooseOpponent(currentLogin) {
	return currentLogin == 'Bob' ? 'Sam' : 'Bob';
}

function getRemoteStream() {
	var miniVideo = $('#miniVideo')[0];
	videoChat.reattachMediaStream(miniVideo, videoChat.localStreamElement);
	
	$('#localVideo').hide();
	$('#remoteVideo, #miniVideo').show();
}

function openPopup(winName, sizes) {
	var scrWidth, scrHeight, winWidth, winHeight, disWidth, disHeight;
	var url, params;
	
	scrWidth = window.screen.availWidth;
	scrHeight = window.screen.availHeight;
	
	if (sizes) {
		winWidth = sizes.width;
		winHeight = sizes.height;
	}
	
	disWidth = (scrWidth - winWidth) / 2;
	disHeight = (scrHeight - winHeight) / 2;
	
	url = window.location.origin + window.location.pathname + 'remotecall.html';
	params = ('width='+winWidth+', height='+winHeight+', left='+disWidth+', top='+disHeight+', ');
	
	return window.open(url, winName, params);
}

function htmlRemoteCallBuilder(selector, qbID, sessionDescription, sessionID, avatar, name) {
	avatar = avatar || 'images/avatar_default.jpg';
	
	selector.find('title').text('Remote call');
	selector.find('.avatar').attr('src', avatar);
	selector.find('.author').html('<b>' + name + '</b><br>is calling you');
	selector.find('#acceptCall').attr('data-qb', qbID).attr('data-name', name).attr('data-id', sessionID).attr('data-description', sessionDescription);
	selector.find('#remoteCall').show();
}

function stopRing(popups) {
	if (Object.keys(popups).length == 0 || Object.keys(popups).length == 1)
		audio.ring.pause();
}
