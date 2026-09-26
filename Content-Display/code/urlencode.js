autowatch = 1;
inlets = 1;
outlets = 1;

// [maxurl]'s "post" message re-splits its arguments on whitespace when it
// builds the request body, even when a Max message box groups a value into
// one quoted atom - so any value containing spaces (or characters like
// ! & =) gets cut down to its first word by the time the server sees it.
// URL-encoding the value here removes anything for maxurl to split on; the
// server already decodes %XX escapes back into the original text.
//
// Send: "encode word1 word2 word3 ..." (e.g. via [prepend encode]).
// Outputs the encoded symbol via outlet 0.

function encode()
{
	var text = arrayfromargs(arguments).join(" ");
	outlet(0, encodeURIComponent(text));
}
