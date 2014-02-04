/*
 * QuickBlox WebRTC Sample
 * version 0.1
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}, 
								{'url': 'turn:turnserver.quickblox.com:3478?transport=udp'},
								{'url': 'turn:turnserver.quickblox.com:3478?transport=tcp'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};
 
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }
};
 
var localStream, remoteStream;
var localVideoElement, remoteVideoElement;
var pc;

/*
  Public methods:
  	- getUserMedia(localVideoEl)
  	- createPeerConnection(remoteVideoEl)
  	- createOffer()
  	- createAnswer()
  	- addCandidate(candidateRawData)
  	- setRemoteDescription(descriptionSDP, descriptionType)

  Public callbacks:
	- onLocalSessionDescription(description)
	- onCandidate(candidate)
	- onAddedRemoteDescription(sessionDescription)
 */


/*
 * GetUserMedia 
 */
function getUserMedia(localVideoEl) {
    traceW("webrtcGetUserMedia....");

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Video & Audio always
    // Can be configured later
	var constraints = {video: true, audio: true};

	function successCallback(localMediaStream) {
	    traceW("getUserMedia Success");
	
	    // save local stream & video element
	    localStream = localMediaStream;
	    localVideoElement = localVideoEl;

        // play own stream
	    localVideoElement.src = window.URL.createObjectURL(localMediaStream);
	    localVideoElement.play();
	}

	function errorCallback(error){
	   traceW("getUserMedia error: ", error);
	}

    // Get User media
	navigator.getUserMedia(constraints, successCallback, errorCallback);
}

/*
 * RTCPeerConnection creation
 */
function createPeerConnection(remoteVideoEl) {
  	try {
   		pc = new RTCPeerConnection(pc_config);
   		pc.onicecandidate = onIceCandidateCallback;
   	 	pc.onaddstream = onRemoteStreamAdded;
   	 	pc.onremovestream = onRemoteStreamRemoved;
   	 	
   	 	pc.addStream(localStream);
   	 	
   	 	// save remote video element
   	 	remoteVideoElement = remoteVideoEl;
   
   	 	traceW('Created RTCPeerConnnection');
  	} catch (e) {
   	 	traceW('Failed to create PeerConnection, exception: ' + e.message);
   	 	alert('Cannot create RTCPeerConnection object.');
      	return;
	}
}

function onIceCandidateCallback(event) {  
    var candidate = event.candidate;	
    
    traceW('iceGatheringState: ' + event.target.iceGatheringState);
    
  	if (candidate) {
  		traceW('onIceCandidateCallback, candidate: ' + candidate.candidate + 
  			', sdpMLineIndex: ' + candidate.sdpMLineIndex + ', sdpMid: ' + candidate.sdpMid);
  			
  		onIceCandidate(candidate);
  	} else {
   	 	traceW('No candidates');
  	}
}

function onRemoteStreamAdded(event) {
 	traceW('Stream added');
 	
 	remoteVideoElement.src = window.URL.createObjectURL(event.stream);
 	remoteVideoElement.play();
 	//
  	remoteStream = event.stream;
}

function onRemoteStreamRemoved(event) {
  	traceW('Stream removed. Event: ', event);
}

function setRemoteDescription(descriptionSDP, descriptionType){
	var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
	traceW('setRemoteDescription: ' + descriptionSDP + ', pc:' + pc);
	
   	pc.setRemoteDescription(sessionDescription,
   		function onSuccess(){
            onAddedRemoteDescription(sessionDescription);
  		},function onError(error){
  			traceW('setRemoteDescription error: ' + error);
  		}
  	);
}

/*
 * Offer/Answer 
 */ 
function createOffer() {
  	traceW('Creating offer to peer...');
  	pc.createOffer(sessionDescriptionSuccessCallback, createOfferFailureCallback);
}

function createAnswer() {
  	traceW('Creating answer to peer...');
  	pc.createAnswer(sessionDescriptionSuccessCallback, createAnswerFailureCallback, sdpConstraints);
}

function sessionDescriptionSuccessCallback(sessionDescription) {
  	// Set Opus as the preferred codec in SDP if Opus is present.
  	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  	
  	traceW('sessionDescriptionSuccessCallback: ' + sessionDescription);
  	
  	pc.setLocalDescription(sessionDescription, 
  		function onSuccess(){
  			onLocalSessionDescription(sessionDescription);
  		},function onError(error){
  			traceW('setLocalDescription error: ' + error);
  		}
  	);
}

function createOfferFailureCallback(event){
  	traceW('createOffer() error: ', event);
}

function createAnswerFailureCallback(event){
  	traceW('createAnswer() error: ', event);
}

/*
 * ICE 
 */ 
function addCandidate(candidateRawData){
	var candidate = new RTCIceCandidate({
     	sdpMLineIndex: candidateRawData.sdpMLineIndex,
      		candidate: candidateRawData.candidate,
      		   sdpMid: candidateRawData.sdpMid
    });
    pc.addIceCandidate(candidate);
}

/*
 * Cleanup 
 */ 
function hangup() {
  	traceW("Closed RTC");
  	pc.close();
  	pc = null;
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
