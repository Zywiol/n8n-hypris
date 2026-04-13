# n8n-nodes-hypris-api

A custom n8n node for seamless integration with the Hypris platform API.

This package provides nodes for authenticating and interacting with Hypris, enabling you to automate workspace management, databases, items, properties, and views directly within your n8n workflows.

## Features

* **Workspace**: List all workspaces and retrieve all resources metadata. Create new Workspaces.
* **Database**: Fetch all items.
* **Item**: 
  * List, create, update, delete records inside your specific databases. 
  * Auto-mapping of complex column types (`link`, `relation`, `people`, `location`, `formula`, `date`).
  * Bulk status & dropdown creation in-flight if the option does not exist.
* **Property (Database Columns)**: 
  * Create robust columns in bulk inside a database.
  * Supported types include: `text`, `number`, `status`, `dropdown`, `relation`, `people`, `link`, `date`, `comments`, `files`, `created-at`, `updated-at` and much more.
  * Delete multiple properties dynamically via ID arrays.
* **View**: Create, Update, and Delete views for a specific database.

## Installation

### Community Nodes
You can install this node from the **Settings > Community Nodes** section in your n8n instance by searching for `n8n-nodes-hypris-api`.

### Manual Installation
If you're running n8n via Docker or a custom self-hosted setup, install the package in the `~/.n8n/custom/` or your specialized node directory:

```bash
npm install n8n-nodes-hypris-api
```

## Authentication

Authentication is handled securely via the **Hypris API** credentials. You must provide an active Hypris API Token (Auth Token) through the n8n UI when setting up your node credentials.

## Usage

1. **Add Node**: Search for "Hypris" in the n8n node search panel.
2. **Select Resource**: Choose between Workspace, Database, Item, Property, View, or ResourceItem.
3. **Select Operation**: Choose the operation (e.g., Create, Update, Get All).
4. **Link complex types**: Provide plain JSON strings to intuitively fill advanced column mapping. E.g.: `{"url": "https://url.com"}`, or simply `https://url.com` for links.

## License

MIT
