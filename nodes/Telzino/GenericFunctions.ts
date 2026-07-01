import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type TelzinoRequestFunctions =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

/**
 * In-memory access-token cache, keyed by client ID + base URL. The module stays
 * loaded for the life of the n8n process, so tokens are reused across executions
 * until shortly before they expire.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function normaliseBaseUrl(baseUrl?: string): string {
	return (baseUrl || 'https://api.telzino.com').replace(/\/$/, '');
}

/**
 * Exchange the client credentials for a Bearer access token via the Telzino
 * OAuth endpoint, caching the result until it is about to expire.
 */
async function getAccessToken(
	this: TelzinoRequestFunctions,
	credentials: IDataObject,
): Promise<string> {
	const baseUrl = normaliseBaseUrl(credentials.baseUrl as string);
	const audience = (credentials.audience as string) || `${baseUrl}/`;
	const cacheKey = `${credentials.clientId}@${baseUrl}`;

	const cached = tokenCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now() + 60_000) {
		return cached.token;
	}

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
	})) as { access_token: string; expires_in?: number };

	const token = response.access_token;
	const ttlSeconds = response.expires_in ?? 86_400;
	tokenCache.set(cacheKey, { token, expiresAt: Date.now() + ttlSeconds * 1000 });

	return token;
}

/**
 * Make an authenticated request to the Telzino API. Fetches (or reuses) an OAuth
 * token and attaches it as a Bearer header.
 */
export async function telzinoApiRequest(
	this: TelzinoRequestFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('telzinoApi');
	const baseUrl = normaliseBaseUrl(credentials.baseUrl as string);
	const token = await getAccessToken.call(this, credentials as IDataObject);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: { Authorization: `Bearer ${token}` },
		body,
		qs,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Walk every page of a paginated list endpoint (page/limit + pagination.hasNext)
 * and return the flattened `data` array.
 */
export async function telzinoApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	const query: IDataObject = { ...qs, limit: 100 };
	let page = 1;
	let hasNext = true;

	do {
		query.page = page;
		const response = await telzinoApiRequest.call(this, 'GET', endpoint, {}, query);
		const data = (response.data as IDataObject[]) ?? [];
		returnData.push(...data);

		const pagination = response.pagination as IDataObject | undefined;
		hasNext = pagination ? Boolean(pagination.hasNext) : false;
		page += 1;
	} while (hasNext);

	return returnData;
}

/**
 * Resolve the account ID: use the credential value when provided, otherwise
 * look it up from GET /v1/me.
 */
export async function getAccountId(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
	const credentials = await this.getCredentials('telzinoApi');
	if (credentials.accountId) {
		return credentials.accountId as string;
	}

	const me = await telzinoApiRequest.call(this, 'GET', '/v1/me');
	return me.account_id as string;
}
