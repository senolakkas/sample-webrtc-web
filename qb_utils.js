function parseXMPPBody(data) {
	try {
		return $.parseJSON(Strophe.unescapeNode(data));
	} catch(err) {
		return Strophe.unescapeNode(data);
	}
}