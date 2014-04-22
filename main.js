var params, chatUser, chatService, recipientID;
var signaling, videoChat;

// Storage QB user ids by their logins
var users = {
	Quick: '999190',
	Blox: '978816'
};

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
			$('#doCall').click(doCall);
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
	createVideoChatInstance();
}

function createVideoChatInstance(sessionID, sessionDescription) {
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
	$('#videochat-footer').hide();
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
	$('#videochat-footer').show();
	$('#doCall, #stopCall').attr('data-qb', qbID);
	if (sessionID)
		$('#doCall').hide().parent().find('#stopCall').show();
	
	videoChat.localStreamElement = $('#localVideo')[0];
	videoChat.remoteStreamElement = $('#remoteVideo')[0];
	videoChat.attachMediaStream(videoChat.localStreamElement, videoChat.localStream);
	
	if (sessionID) {
		getRemoteStream();
		videoChat.accept(qbID, chatUser.login);
	}
}

function getMediaError(qbID) {
	videoChat.reject(qbID, chatUser.login);
}

function onCall(qbID, sessionDescription, sessionID, name, avatar) {
	/*var win, selector, winName = 'remoteCall' + qbID;
	
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
			if (switches.isPopupClosed)
				rejectCall(qbID, sessionID);
			switches.isPopupClosed = true;
		};
	};*/
}

function onAccept(qbID) {
	/*var win = popups['videochat'];
	getRemoteStream($(win.document));*/
}

function onReject(qbID) {
	/*var win = popups['videochat'];
	if (win)
		$(win.document).find('#stopCall').hide().parent().find('#doCall').show();*/
}

function onStop(qbID) {
	/*var win;
	
	win = popups['videochat'];
	if (win && qbID == $(win.document).find('#stopCall').data('qb')) {
		switches.isPopupClosed = false;
		win.close();
		delete popups['videochat'];
		
		videoChat.hangup();
		videoChat = null;
	}
	
	win = popups['remoteCall' + qbID];
	if (win) {
		switches.isPopupClosed = false;
		win.close();
		delete popups['remoteCall' + qbID];
		
		stopRing(popups);
	}*/
}

/* Helpers
----------------------------------------------------------*/
function chooseOpponent(currentLogin) {
	return currentLogin == 'Quick' ? 'Blox' : 'Quick';
}

function getRemoteStream() {
	var miniVideo = $('#miniVideo')[0];
	videoChat.reattachMediaStream(miniVideo, videoChat.localStreamElement);
	
	$('#localVideo').hide();
	$('#remoteVideo, #miniVideo').show();
}
