/*
 * QuickBlox WebRTC Sample
 * version 0.1
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
var QB_OFFER = 'qbvideochat_offer';
var QB_ANSWER = 'qbvideochat_answer';
var QB_CANDIDATE = 'qbvideochat_candidate';
var QB_STOPCALL = 'qbvideochat_stopCall';

var connection, userJID;

/*
  Public methods:
  	- connect(params)
  	- call(userID)
  	- accept(userID)
  	- reject(userID)
  	- sendOffer(userID, sdpStringRepresentation)
  	- sendAnswer(userID, sdpStringRepresentation)
  	- sendCandidate(userID, candidate)
  	- stop(userID, reason)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onCall(fromUserID)
	- onAccept(fromUserID)
	- onReject(fromUserID)
	- onOffer(fromUserID, description)
	- onAnswer(fromUserID, description)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */
 
/*
 * Public interface
 */
function connect(params){
	// Init QB application
	//
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	
	// Create session
	// 
	QB.createSession(params, function(err, result){
		if (err) {
			onConnectionFailed(err.detail);

		} else {
			console.log(result);
		
		    // Login to Chat
		    //
		    xmppConnect(result.user_id, params['password']);
		}
	});
}

function call(userID) {
	trace('call ' + userID);
    sendMessage(userID, QB_CALL, null);
}

function accept(userID) {
	trace('accept ' + userID);
    sendMessage(userID, QB_ACCEPT, null);
}

function reject(userID) {
	trace('reject ' + userID);
    sendMessage(userID, QB_REJECT, null);
}

function sendOffer(userID, sessionDescription) {
	trace('sendOffer ' + userID);
    sendMessage(userID, QB_OFFER, sessionDescription);
}

function sendAnswer(userID, sessionDescription) {
	trace('sendAnswer ' + userID);
    sendMessage(userID, QB_ANSWER, sessionDescription);
}

function sendCandidate(userID, candidate) {
	trace('sendCandidate ' + userID);
    sendMessage(userID, QB_CANDIDATE, candidate);
}

function stop(userID, reason) {
	trace('stop ' + userID);
    sendMessage(userID, QB_STOPCALL, reason);
}

/*
 * Transport layer 
 */
function xmppConnect(user_id, password) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	connection.addHandler(onMessage, null, 'message', null, null,  null); 
 
	console.log(connection);

	userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	console.log('Connecting to Chat: userJID=' + userJID + ', password=' + password);
	
	connection.connect(userJID, password, function (status) {
		switch (status) {
		case Strophe.Status.ERROR:
		    console.log('[Connection] Error');
		    break;
		case Strophe.Status.CONNECTING:
			console.log('[Connection] Connecting');
			break;
		case Strophe.Status.CONNFAIL:
		    onConnectionFailed('[Connection] Failed to connect');
		    break;
		case Strophe.Status.AUTHENTICATING:
		    console.log('[Connection] Authenticating');
		    break;
		case Strophe.Status.AUTHFAIL:
		    onConnectionFailed('[Connection] Unauthorized');
		    break;
		case Strophe.Status.CONNECTED:
		    console.log('[Connection] Connected');
		    onConnectionSuccess(user_id);
		    break;
		case Strophe.Status.DISCONNECTED:
		    console.log('[Connection] Disconnected');
		    break;
		case Strophe.Status.DISCONNECTING:
		    console.log('[Connection] Disconnecting');
		    onConnectionDisconnected();
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
    var body = Strophe.getText(elems[0]);
         
	console.log('onMessage: from ' + from + ',type: ' + type);
         
	fromUserID = from.split('-')[0];
	
	switch (type) {
	case QB_CALL:
		onCall(fromUserID);
		break;
	case QB_ACCEPT:
		onAccept(fromUserID);
		break;
	case QB_REJECT:
		onReject(fromUserID);
		break;
	case QB_OFFER:
		onOffer(fromUserID, body);
		break;
	case QB_ANSWER:
		onAnswer(fromUserID, body);
		break;
	case QB_CANDIDATE:
		onCandidate(fromUserID, body);
		break;
	case QB_STOPCALL:
		onStop(fromUserID, body);
		break;
	}

    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

/*
 * Helpers 
 */
function sendMessage(userID, type, data) {
    var opponentJID = userID + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	var body = data == null ? '' : data;
    
    var reply = $msg({to: opponentJID, 
                     from: userJID, 
                     type: type})
            .cnode(Strophe.xmlElement('body', body));
        
    connection.send(reply);
}

function trace(text) {
 	 console.log("[qb_signalling]: " + text);
}

