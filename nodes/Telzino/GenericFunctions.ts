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
import { NodeApiError, jsonParse } from 'n8n-workflow';

type TelzinoRequestFunctions =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

function normaliseBaseUrl(baseUrl?: string): string {
	return (baseUrl || 'https://api.telzino.com').replace(/\/+$/, '');
}

/**
 * Make an authenticated request to the Telzino API.
 *
 * Authentication — the OAuth client-credentials token exchange and the Bearer
 * header — lives in the telzinoApi credential (preAuthentication + authenticate).
 * Using httpRequestWithAuthentication means n8n attaches the token, caches it,
 * and transparently re-runs preAuthentication on a 401, so an expired token is
 * refreshed instead of being reused.
 */
export async function telzinoApiRequest(
	this: TelzinoRequestFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('telzinoApi');
	const baseUrl = normaliseBaseUrl(credentials.baseUrl as string);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
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
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'telzinoApi',
			options,
		)) as IDataObject;
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

/**
 * Run a picker lookup, returning an empty list when the API key's scope does not
 * allow it (403). Reseller, organization and agent-scoped keys cannot list
 * resellers or organizations, and that must not break the pickers.
 */
export async function emptyIfOutOfScope(
	lookup: () => Promise<IDataObject[]>,
): Promise<IDataObject[]> {
	return await lookup().catch((error: NodeApiError) => {
		if (String(error.httpCode) === '403') {
			return [];
		}
		// Already a NodeApiError from telzinoApiRequest.
		return Promise.reject(error);
	});
}

/** Parse a JSON node parameter; undefined when it is empty ({} or []), so it is not sent. */
export function parseJsonField(value: unknown): IDataObject | IDataObject[] | undefined {
	const parsed = (typeof value === 'string' ? jsonParse(value) : value) as
		| IDataObject
		| IDataObject[]
		| undefined;
	if (!parsed || Object.keys(parsed).length === 0) {
		return undefined;
	}
	return parsed;
}
