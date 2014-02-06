/*
 * QuickBlox VideoChat WebRTC signaling library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */
 
// QB Account params
var QBPARAMS = {
                        app_id      : '92',
                        auth_key    : 'wJHdOcQSxXQGWx5',
                        auth_secret : 'BTFsj7Rtt27DAmT'
}

//Chat params
var CHAT = {
                        server      : 'chat.quickblox.com',
                        bosh_url    : 'http://chat.quickblox.com:5280'
}

var QB_CALL = 'qbvideochat_call';
var QB_ACCEPT = 'qbvideochat_acceptCall';
var QB_REJECT = 'qbvideochat_rejectCall';
var QB_CANDIDATE = 'qbvideochat_candidate';
var QB_STOPCALL = 'qbvideochat_stopCall';

/*
  Public methods:
  	- connect({login: login, password: password})
  	- call(userID, sessionDescription, sessionID)
  	- accept(userID, sessionDescription, sessionID)
  	- reject(userID, sessionID)
  	- sendCandidate(userID, candidate, sessionID)
  	- stop(userID, reason, sessionID)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onConnectionDisconnected()
	- onCall(fromUserID, sessionDescription, sessionID)
	- onAccept(fromUserID, sessionDescription, sessionID)
	- onReject(fromUserID)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */
 
function QBVideoChatSignaling(){

	this.xmppConnect = function(user_id, password) {
		this.connection = new Strophe.Connection(CHAT.bosh_url);
		this.connection.rawInput = this.rawInput;
		this.connection.rawOutput = this.rawOutput;
		this.connection.addHandler(this.onMessage, null, 'message', QB_CALL, null,  null);
		this.connection.addHandler(this.onMessage, null, 'message', QB_ACCEPT, null,  null); 
		this.connection.addHandler(this.onMessage, null, 'message', QB_REJECT, null,  null); 
		this.connection.addHandler(this.onMessage, null, 'message', QB_CANDIDATE, null,  null);
		this.connection.addHandler(this.onMessage, null, 'message', QB_STOPCALL, null,  null); 
 
		traceS(this.connection);

		this.userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		traceS('Connecting to Chat: userJID=' + this.userJID + ', password=' + password);
	
		this.connection.connect(this.userJID, password, function (status) {
			switch (status) {
			case Strophe.Status.ERROR:
				traceS('[Connection] Error');
				break;
			case Strophe.Status.CONNECTING:
				traceS('[Connection] Connecting');
				break;
			case Strophe.Status.CONNFAIL:
				if (this.onConnectionFailed && typeof(this.onConnectionFailed) === "function") {
					this.onConnectionFailed('[Connection] Failed to connect');
				}
				break;
			case Strophe.Status.AUTHENTICATING:
				traceS('[Connection] Authenticating');
				break;
			case Strophe.Status.AUTHFAIL:
				if (this.onConnectionFailed && typeof(this.onConnectionFailed) === "function") {
					this.onConnectionFailed('[Connection] Unauthorized');
				}
				break;
			case Strophe.Status.CONNECTED:
				traceS('[Connection] Connected');
				if (this.onConnectionSuccess) {
					this.onConnectionSuccess(user_id);
				}else{
					traceS('[Connection] Connected: no callback');
				}
				break;
			case Strophe.Status.DISCONNECTED:
				traceS('[Connection] Disconnected');
				break;
			case Strophe.Status.DISCONNECTING:
				traceS('[Connection] Disconnecting');
				if (this.onConnectionDisconnected && typeof(this.onConnectionDisconnected) === "function") {
					this.onConnectionDisconnected();
				}
				break;
			case Strophe.Status.ATTACHED:
				traceS('[Connection] Attached');
				break;
			}
		});
	}
	
	this.rawInput = function(data) {
    	traceS('RECV: ' + data);
	}

	this.rawOutput = function(data) {
    	traceS('SENT: ' + data);
	}	

	this.onMessage = function(msg) {
		var to = msg.getAttribute('to');
		var from = msg.getAttribute('from');
		var type = msg.getAttribute('type');
		var elems = msg.getElementsByTagName('body');
		var body = Strophe.getText(elems[0]);
		 
		traceS('onMessage: from ' + from + ',type: ' + type);
		 
		var fromUserID = from.split('-')[0];
	
		switch (type) {
		case QB_CALL:
			if (this.onCall && typeof(this.onCall) === "function") {
				this.onCall(fromUserID, body, sessionID);
			}
			break;
		case QB_ACCEPT:
			if (this.onAccept && typeof(this.onAccept) === "function") {
				this.onAccept(fromUserID, body, sessionID);
			}
			break;
		case QB_REJECT:
			if (this.onReject && typeof(this.onReject) === "function") {
				this.onReject(fromUserID);
			}
			break;
		case QB_CANDIDATE:
			if (this.onCandidate && typeof(this.onCandidate) === "function") {
			  	var jsonCandidate = xmppTextToDictionary(body);
				this.onCandidate(fromUserID, jsonCandidate);
			}
			break;
		case QB_STOPCALL:
			if (this.onStop && typeof(this.onStop) === "function") {
				this.onStop(fromUserID, body);
			}
			break;
		}

		// we must return true to keep the handler alive.  
		// returning false would remove it after it finishes.
		return true;
	}
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var opponentJID = userID + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		var body = data == null ? '' : data;
	
		var reply = $msg({to: opponentJID, 
						 from: userJID, 
						 type: type})
				.cnode(Strophe.xmlElement('body', body));
		
		this.connection.send(reply);
	}

	this.xmppTextToDictionary = function(data) {
		try {
			return $.parseJSON(Strophe.unescapeNode(data));
		} catch(err) {
			return Strophe.unescapeNode(data);
		}
	}

	this.xmppDictionaryToText = function(data) {
		return Strophe.escapeNode(JSON.stringify(data));
	}
}
 
QBVideoChatSignaling.prototype.login = function (params){
	// Init QB application
	//
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	
	// Create session
	// 
	var self = this; 
	QB.createSession(params, function(err, result){
		if (err) {
			if (self.onConnectionFailed && typeof(self.onConnectionFailed) === "function") {
				self.onConnectionFailed(err.detail);
			}

		} else {
			traceS(result);
		
		    // Login to Chat
		    //
		    self.xmppConnect(result.user_id, params['password']);
		}
	});
}

QBVideoChatSignaling.prototype.call = function(userID, sessionDescription, sessionID) {
	traceS('call ' + userID);
    this.sendMessage(userID, QB_CALL, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.accept = function(userID, sessionDescription, sessionID) {
	traceS('accept ' + userID);
    this.sendMessage(userID, QB_ACCEPT, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.reject = function(userID, sessionID) {
	traceS('reject ' + userID);
    this.sendMessage(userID, QB_REJECT, null, sessionID);
}

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	traceS('sendCandidate ' + userID + ', candidate: ' + candidate);
    this.sendMessage(userID, QB_CANDIDATE, candidate, sessionID);
}

QBVideoChatSignaling.prototype.stop = function(userID, reason, sessionID) {
	traceS('stop ' + userID);
    this.sendMessage(userID, QB_STOPCALL, reason, sessionID);
}


function traceS(text) {
	console.log("[qb_videochat_signalling]: " + text);
}
