import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class TelzinoApi implements ICredentialType {
	name = 'telzinoApi';

	displayName = 'Telzino API';

	documentationUrl = 'https://docs.telzino.com/api-reference/authentication';

	icon = { light: 'file:icons/telzino.svg', dark: 'file:icons/telzino.dark.svg' } as const;

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
		// Populated by preAuthentication() below; not shown to the user.
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
		},
	];

	// Exchange the client credentials for a Bearer token before requests run.
	// n8n caches the returned sessionToken and re-invokes this method when a
	// request comes back 401, so tokens refresh automatically and expired
	// tokens are never reused.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const baseUrl = ((credentials.baseUrl as string) || 'https://api.telzino.com').replace(
			/\/+$/,
			'',
		);
		const audience = (credentials.audience as string) || `${baseUrl}/`;

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/oauth/token`,
			headers: { 'Content-Type': 'application/json' },
			body: {
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				audience,
				grant_type: 'client_credentials',
			},
			json: true,
		})) as { access_token: string };

		return { sessionToken: response.access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: "={{ ($credentials.baseUrl || 'https://api.telzino.com').replace(/\\/+$/, '') }}",
			url: '/v1/me',
		},
	};
}
