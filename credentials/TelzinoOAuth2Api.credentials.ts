import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Telzino API keys are OAuth 2.0 client credentials. The token exchange, caching
 * and refresh are handled by n8n's built-in oAuth2Api credential; this file only
 * fixes the grant type and token endpoint and adds the Telzino-specific fields.
 */
export class TelzinoOAuth2Api implements ICredentialType {
	name = 'telzinoOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Telzino OAuth2 API';

	documentationUrl = 'https://docs.telzino.com/api-reference/authentication';

	icon = { light: 'file:icons/telzino.svg', dark: 'file:icons/telzino.dark.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.telzino.com',
			description: 'The base URL of the Telzino API. Change only if Telzino gave you a different one.',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["baseUrl"].replace(/\\/+$/, "")}}/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		// Telzino's token endpoint requires an `audience`, sent with the token request.
		{
			displayName: 'Send Additional Body Properties',
			name: 'sendAdditionalBodyProperties',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Additional Body Properties',
			name: 'additionalBodyProperties',
			type: 'hidden',
			default: '{"audience":"https://api.telzino.com/"}',
		},
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			default: '',
			description:
				'Your Telzino account ID. Leave blank to resolve it automatically from GET /v1/me.',
		},
	];
}
