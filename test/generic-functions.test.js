// Runs against the built output: `npm test`.
const test = require('node:test');
const assert = require('node:assert');
const { NodeApiError } = require('n8n-workflow');
const { emptyIfOutOfScope, parseJsonField } = require('../dist/nodes/Telzino/GenericFunctions');

const node = { name: 'Telzino', type: 'telzino', typeVersion: 1, position: [0, 0], parameters: {} };
const apiError = (status) => new NodeApiError(node, { message: 'x', response: { status } });

test('a 403 from a scoped key gives an empty picker list', async () => {
	assert.deepStrictEqual(await emptyIfOutOfScope(async () => { throw apiError(403); }), []);
});

test('other errors still surface', async () => {
	await assert.rejects(emptyIfOutOfScope(async () => { throw apiError(401); }));
});

test('empty JSON fields are not sent', () => {
	assert.strictEqual(parseJsonField('{}'), undefined);
	assert.strictEqual(parseJsonField('[]'), undefined);
	assert.strictEqual(parseJsonField(undefined), undefined);
	assert.deepStrictEqual(parseJsonField('{"enabled":true}'), { enabled: true });
	assert.deepStrictEqual(parseJsonField([{ send_dtmf: '1' }]), [{ send_dtmf: '1' }]);
});
