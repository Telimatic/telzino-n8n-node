import {
	NodeOperationError,
	jsonParse,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	getAccountId,
	telzinoApiRequest,
	telzinoApiRequestAllItems,
} from './GenericFunctions';

export class Telzino implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telzino',
		name: 'telzino',
		icon: 'file:telzino.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'List Telzino resellers and agents, and place outbound AI voice calls',
		defaults: {
			name: 'Telzino',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'telzinoApi',
				required: true,
				testedBy: 'telzinoApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Agent', value: 'agent' },
					{ name: 'Call', value: 'call' },
					{ name: 'Reseller', value: 'reseller' },
				],
				default: 'call',
			},

			// ----------------------------------
			//         reseller operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['reseller'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List resellers',
						description: 'Return the resellers for your account',
					},
				],
				default: 'list',
			},

			// ----------------------------------
			//           agent operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['agent'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List agents',
						description: 'Return the agents accessible to your account',
					},
				],
				default: 'list',
			},

			// ----------------------------------
			//           call operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Place an outbound call',
						description: 'Queue an outbound AI voice call from an agent',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an outbound call',
						description: 'Retrieve the status and result of an outbound call by ID',
					},
				],
				default: 'create',
			},

			// ----------------------------------
			//        list: returnAll / limit
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['agent', 'reseller'], operation: ['list'] } },
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				displayOptions: {
					show: { resource: ['agent', 'reseller'], operation: ['list'], returnAll: [false] },
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['agent'], operation: ['list'] } },
				description: 'Optionally filter agents by their organization ID',
			},

			// ----------------------------------
			//           call: create
			// ----------------------------------
			{
				displayName: 'Reseller Name or ID',
				name: 'reseller',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getResellers' },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description:
					'Pick a reseller to filter the organizations below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
					loadOptionsDependsOn: ['reseller'],
				},
				required: true,
				default: '',
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description:
					'Pick an organization from the selected reseller to filter the agents below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Agent Name or ID',
				name: 'agentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAgentsByOrg',
					loadOptionsDependsOn: ['organization'],
				},
				required: true,
				default: '',
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description:
					'The agent that places the call, from the selected organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'To Number',
				name: 'toNumber',
				type: 'string',
				required: true,
				default: '',
				placeholder: '+18135551234',
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				description: 'Destination number in E.164 format',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['call'], operation: ['create'] } },
				options: [
					{
						displayName: 'Call Context',
						name: 'call_context',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description:
							'Up to 4000 characters appended to the agent system prompt for this specific call',
					},
					{
						displayName: 'Callback URL',
						name: 'callback_url',
						type: 'string',
						default: '',
						placeholder: 'https://example.com/webhook',
						description:
							'HTTPS URL that receives the result webhook when the call reaches a terminal state',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description:
							'Opaque JSON object (max 16KB) stored with the call and echoed back in the result webhook',
					},
				],
			},

			// ----------------------------------
			//             call: get
			// ----------------------------------
			{
				displayName: 'Agent ID',
				name: 'getAgentId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['call'], operation: ['get'] } },
				description: 'The ID of the agent that placed the call',
			},
			{
				displayName: 'Call ID',
				name: 'callId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['call'], operation: ['get'] } },
				description: 'The ID of the outbound call to retrieve (the ID returned by Create)',
			},
		],
	};

	methods = {
		loadOptions: {
			async getResellers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const accountId = await getAccountId.call(this);
				const response = await telzinoApiRequest.call(
					this,
					'GET',
					`/v1/accounts/${accountId}/resellers`,
				);
				const data = (response.data as IDataObject[]) ?? [];
				return data.map((reseller) => ({
					name:
						(reseller.name as string) ||
						(reseller.external_id as string) ||
						(reseller.id as string),
					value: reseller.id as string,
				}));
			},

			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resellerId = this.getCurrentNodeParameter('reseller') as string;
				if (!resellerId) {
					return [];
				}
				const response = await telzinoApiRequest.call(
					this,
					'GET',
					`/v1/resellers/${resellerId}/organizations`,
				);
				const data = (response.data as IDataObject[]) ?? [];
				return data.map((org) => ({
					name: (org.name as string) || (org.external_id as string) || (org.id as string),
					value: org.id as string,
				}));
			},

			async getAgentsByOrg(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const organizationId = this.getCurrentNodeParameter('organization') as string;
				const qs: IDataObject = {};
				if (organizationId) {
					qs.organization_id = organizationId;
				}
				const agents = await telzinoApiRequestAllItems.call(this, '/v1/agents', qs);
				return agents.map((agent) => ({
					name: (agent.name as string) || (agent.id as string),
					value: agent.id as string,
				}));
			},
		},

		credentialTest: {
			async telzinoApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const creds = (credential.data ?? {}) as IDataObject;
				const baseUrl = ((creds.baseUrl as string) || 'https://api.telzino.com').replace(/\/$/, '');
				const audience = (creds.audience as string) || `${baseUrl}/`;

				try {
					const tokenResponse = (await this.helpers.request({
						method: 'POST',
						uri: `${baseUrl}/oauth/token`,
						body: {
							client_id: creds.clientId,
							client_secret: creds.clientSecret,
							audience,
							grant_type: 'client_credentials',
						},
						json: true,
					})) as { access_token?: string };

					if (!tokenResponse.access_token) {
						return { status: 'Error', message: 'No access token returned by Telzino.' };
					}

					await this.helpers.request({
						method: 'GET',
						uri: `${baseUrl}/v1/me`,
						headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
						json: true,
					});

					return { status: 'OK', message: 'Connection successful!' };
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection failed: ${(error as Error).message}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[];

				if (resource === 'reseller' && operation === 'list') {
					const accountId = await getAccountId.call(this);
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const response = await telzinoApiRequest.call(
						this,
						'GET',
						`/v1/accounts/${accountId}/resellers`,
					);
					let data = (response.data as IDataObject[]) ?? [];
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						data = data.slice(0, limit);
					}
					responseData = data;
				} else if (resource === 'agent' && operation === 'list') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const organizationId = this.getNodeParameter('organizationId', i, '') as string;
					const qs: IDataObject = {};
					if (organizationId) {
						qs.organization_id = organizationId;
					}

					if (returnAll) {
						responseData = await telzinoApiRequestAllItems.call(this, '/v1/agents', qs);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit = limit;
						qs.page = 1;
						const response = await telzinoApiRequest.call(this, 'GET', '/v1/agents', {}, qs);
						responseData = (response.data as IDataObject[]) ?? [];
					}
				} else if (resource === 'call' && operation === 'create') {
					const agentId = this.getNodeParameter('agentId', i) as string;
					const toNumber = this.getNodeParameter('toNumber', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = { to_number: toNumber };

					if (additionalFields.call_context) {
						body.call_context = additionalFields.call_context;
					}
					if (additionalFields.callback_url) {
						body.callback_url = additionalFields.callback_url;
					}
					if (additionalFields.metadata) {
						body.metadata =
							typeof additionalFields.metadata === 'string'
								? jsonParse(additionalFields.metadata as string)
								: additionalFields.metadata;
					}

					responseData = await telzinoApiRequest.call(
						this,
						'POST',
						`/v1/agents/${agentId}/outbound-calls`,
						body,
					);
				} else if (resource === 'call' && operation === 'get') {
					const agentId = this.getNodeParameter('getAgentId', i) as string;
					const callId = this.getNodeParameter('callId', i) as string;
					responseData = await telzinoApiRequest.call(
						this,
						'GET',
						`/v1/agents/${agentId}/outbound-calls/${callId}`,
					);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
