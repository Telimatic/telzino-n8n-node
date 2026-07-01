import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

export class TelzinoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telzino Trigger',
		name: 'telzinoTrigger',
		icon: 'file:telzino.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when Telzino sends a call event webhook',
		defaults: {
			name: 'Telzino Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'To start receiving events, copy the <b>Production URL</b> above and add it as a webhook on your Telzino agent (Agent Settings &rarr; Functions &rarr; Webhooks), selecting the matching condition (before / during / after call).',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'POST',
				description: 'The HTTP method Telzino is configured to use when calling this webhook',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'After Call', value: 'after_call' },
					{ name: 'Any', value: 'any' },
					{ name: 'Before Call', value: 'before_call' },
					{ name: 'During Call', value: 'during_call' },
				],
				default: 'any',
				description:
					'Only emit when the incoming payload condition matches this event. Use "Any" to pass through every request.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const event = this.getNodeParameter('event', 'any') as string;
		const body = (this.getBodyData() ?? {}) as IDataObject;
		const headers = this.getHeaderData();
		const query = this.getQueryData() as IDataObject;

		// Best-effort filtering: if the payload carries a recognisable condition
		// field that doesn't match the configured event, ignore the request
		// (return without workflowData so the workflow does not start).
		if (event !== 'any') {
			const condition = (body.condition ?? body.event ?? body.type) as string | undefined;
			if (condition && condition !== event) {
				return {};
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					body,
					headers,
					query,
				}),
			],
		};
	}
}
