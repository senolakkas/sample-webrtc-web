/*
 * QuickBlox VideoChat WebRTC library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

// STUN/TURN servers
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}, 
								{'url': 'turn:turnserver.quickblox.com:3478?transport=udp'},
								{'url': 'turn:turnserver.quickblox.com:3478?transport=tcp'}]};

// SDP constraints 
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }
};

function QBVideoChat(localStreamElement, remoteStreamElement, constraints){

    // save local & remote <video> elements
    this.localStreamElement = localStreamElement;
    this.remoteStreamElement = remoteStreamElement;
    
    // Media constraints. Video & Audio always can be configured later
    this.constraints = constraints;
    
    
    // Logger
    function traceVC(text) {
 		console.log("[qb_videochat]: " + text);
	}
    
    // MediaStream getUserMedia 
	var getUserMedia = function () {
		traceVC("getUserMedia...");

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

		function successCallback(localMediaStream) {
			traceVC("getUserMedia successCallback");
	
			// save local stream
			this.localStream = localMediaStream;

			// play own stream
			this.localStreamElement.src = window.URL.createObjectURL(localMediaStream);
			this.localStreamElement.play();
		}

		function errorCallback(error){
		   traceVC("getUserMedia errorCallback: ", error);
		}

		// Get User media
		navigator.getUserMedia(this.constraints, successCallback, errorCallback);
	}
	
	// RTCPeerConnection creation
	var createRTCPeerConnection = function () {
		traceVC("createRTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(pc_config);
			this.pc.onicecandidate = onIceCandidateCallback;
			this.pc.onaddstream = onRemoteStreamAddedCallback;
			this.pc.onremovestream = onRemoteStreamRemovedCallback;
		
			this.pc.addStream(this.localStream);
   
			traceVC('Created RTCPeerConnnection');
		} catch (e) {
			traceVC('Failed to create RTCPeerConnection, exception: ' + e.message);
			alert('Cannot create RTCPeerConnection object.');
		}
	}
	
	
	// onIceCandidate callback
	function onIceCandidateCallback(event) {  
		var candidate = event.candidate;	
	
		traceVC('iceGatheringState: ' + event.target.iceGatheringState);
	
		if (candidate) {
			traceVC('onIceCandidateCallback, candidate: ' + candidate.candidate + 
				', sdpMLineIndex: ' + candidate.sdpMLineIndex + ', sdpMid: ' + candidate.sdpMid);
			
			//onIceCandidate(candidate);
		} else {
			traceVC('No candidates');
		}
	}

	// onRemoteStreamAdded callback
	function onRemoteStreamAddedCallback(event) {
 		traceVC('Remote stream added: ' + event);
 	
 	 	// save remote stream
  		this.remoteStream = event.stream;
  		
  		// play remote stream
 		this.remoteStreamElement.src = window.URL.createObjectURL(event.stream);
 		this.remoteStreamElement.play();
	}

	// onRemoteStreamRemoved callback
	function onRemoteStreamRemovedCallback(event) {
  		 traceVC('Remote stream removed: ' + event);
	}
	
	// set Remote description
	var setRemoteDescription = function (descriptionSDP, descriptionType){
		var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		traceVC('setRemoteDescription: ' + descriptionSDP + ', pc:' + pc);
	
		this.pc.setRemoteDescription(sessionDescription,
			function onSuccess(){
				//onAddedRemoteDescription(sessionDescription);
			},function onError(error){
				traceVC('setRemoteDescription error: ' + error);
			}
		);
	}
	
	function onGetSessionDescriptionSuccessCallback(sessionDescription) {
  		// Set Opus as the preferred codec in SDP if Opus is present.
		sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	
		traceVC('sessionDescriptionSuccessCallback: ' + sessionDescription);
	
		this.pc.setLocalDescription(sessionDescription, 
			function onSuccess(){
				//onLocalSessionDescription(sessionDescription);
			},function onError(error){
				traceVC('setLocalDescription error: ' + error);
			}
		);
	}

	function onCreateOfferFailureCallback(event){
		traceVC('createOffer() error: ', event);
	}

	function onCreateAnswerFailureCallback(event){
		traceVC('createAnswer() error: ', event);
	}
	
	// Add ICE candidates 
	this.addCandidate = function (candidateRawData){
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: candidateRawData.sdpMLineIndex,
				candidate: candidateRawData.candidate,
				   sdpMid: candidateRawData.sdpMid
		});
		this.pc.addIceCandidate(candidate);
	}

	// Cleanup 
	this.hangup = function () {
  		traceVC("Closed RTC");
  		this.pc.close();
  		this.pc = null;
	}
}
    
// Call to user with ID   
QBVideoChat.prototype.call = function(userID) {
	traceVC("Call");
	
	traceVC('Creating offer to peer...');
  	this.pc.createOffer(onGetSessionDescriptionSuccessCallback, onCreateOfferFailureCallback);
}

// Accept call from user with ID  
QBVideoChat.prototype.accept = function(userID) {
	traceVC("Accept");

  	traceVC('Creating answer to peer...');
  	this.pc.createAnswer(onGetSessionDescriptionSuccessCallback, onCreateAnswerFailureCallback, sdpConstraints);
}

// Reject call from user with ID   
QBVideoChat.prototype.reject = function(userID) {

}








/*
 * Helpers 
 */ 
 
// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

function traceW(text) {
 	 console.log("[qb_webrtc]: " + text);
}

    
    

}