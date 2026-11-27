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

> **Install `n8n-nodes-telzino-ai`, not `n8n-nodes-telzino`.** The similarly
> named `n8n-nodes-telzino` package is an older, unverified package from another
> author. It is not maintained by Telzino, calls an outdated endpoint, and
> registers a credential with the same name as this one, so the two conflict.
> If it is installed, uninstall it before installing this package.

## Credentials

The **Telzino API** credential authenticates with Telzino using OAuth 2.0
client credentials. You will need:

- **Client ID** and **Client Secret** from your Telzino dashboard.
- (Optional) **Account ID** — auto-resolved via `GET /v1/me` when left blank.

Use **Test Connection** to verify the credential against the Telzino API.

### Scoped API keys

Keys limited to one reseller or one organization work. On **Call → Create**,
leave **Reseller** and **Organization** empty: they are optional filters, and
the **Agent** list shows every agent the key can reach.

A key limited to **one agent** can place calls, but it cannot list agents and
cannot call `GET /v1/me`, so **Test Connection** reports a failure and the
**Agent** list does not load. Save the credential anyway and enter the agent ID
as an expression.

## Nodes

- **Telzino** (action) — list resellers, organizations, and agents, and place
  outbound AI voice calls.

### Consent basis for outbound calls

Telzino requires every outbound call to state the legal basis it is placed
under, unless the agent has `require_consent_basis` turned off. Set **Consent
Basis** on the **Call → Create** operation; without it, agents that require one
refuse the call with `400 consent_required`. Add a **Consent Reference** under
Additional Fields to record where the consent is stored. See
[Outbound Compliance](https://docs.telzino.com/functions/outbound-compliance#consent-basis).

### Other Call → Create fields

Additional Fields also covers **Greeting**, **Voicemail Message**, **AMD
Config**, **IVR Navigation**, **IVR Map**, **Retry Policy ID**, **Callee
Timezone**, **Call Context**, **Callback URL**, and **Metadata**. See the
[Trigger Outbound Call](https://docs.telzino.com/api-reference/outbound-calls/create)
reference for what each one does.

## Resources

- [Telzino API reference](https://docs.telzino.com/api-reference/overview)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://github.com/Telimatic/telzino-n8n-node/blob/main/LICENSE.md)
