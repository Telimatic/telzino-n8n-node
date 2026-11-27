# n8n-nodes-telzino-ai

This is an [n8n](https://n8n.io) community node package for the
[Telzino](https://docs.telzino.com) AI voice agent platform.

It lets you place outbound AI voice calls and list Telzino resellers,
organizations, and agents directly from your workflows.

To react to Telzino call events, point a Telzino agent webhook (Agent Settings
&rarr; Functions &rarr; Webhooks), or the outbound call's **Callback URL**, at an
n8n **Webhook** trigger node — no dedicated trigger node is required.

[Installation](#installation) ·
[Credentials](#credentials) ·
[Nodes](#nodes) ·
[Resources](#resources)

## Installation

Follow the
[community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
and use the package name `n8n-nodes-telzino-ai`.

## Credentials

The **Telzino API** credential authenticates with Telzino using OAuth 2.0
client credentials. You will need:

- **Client ID** and **Client Secret** from your Telzino dashboard.
- (Optional) **Account ID** — auto-resolved via `GET /v1/me` when left blank.

Use **Test Connection** to verify the credential against the Telzino API.

## Nodes

- **Telzino** (action) — list resellers, organizations, and agents, and place
  outbound AI voice calls.

## Resources

- [Telzino API reference](https://docs.telzino.com/api-reference/overview)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://github.com/Telimatic/telzino-n8n-node/blob/main/LICENSE.md)
