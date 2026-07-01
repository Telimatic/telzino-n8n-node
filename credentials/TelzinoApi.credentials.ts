import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TelzinoApi implements ICredentialType {
	name = 'telzinoApi';

	displayName = 'Telzino API';

	documentationUrl = 'https://docs.telzino.com/api-reference/authentication';

	// The OAuth client-credentials token exchange and Bearer header are handled
	// in code (nodes/Telzino/GenericFunctions.ts) rather than via n8n's generic
	// authenticate/preAuthentication, so the token is reliably attached on every
	// request. Connection testing is done by the node's `telzinoApiTest` method.
	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'The OAuth client ID from your Telzino dashboard',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The OAuth client secret from your Telzino dashboard',
		},
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			default: '',
			description:
				'Your Telzino account ID. Leave blank to resolve it automatically from GET /v1/me.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.telzino.com',
			description: 'The base URL of the Telzino API. Change only for self-hosted or staging.',
		},
		{
			displayName: 'Audience',
			name: 'audience',
			type: 'string',
			default: 'https://api.telzino.com/',
			description: 'OAuth audience sent during the token exchange',
		},
	];
}
