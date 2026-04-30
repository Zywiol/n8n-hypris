import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';

export class Hypris implements INodeType {
	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: 'https://api.hypris.com/v1/me/workspaces',
						json: true,
					});
					let workspaces = [];
					if (Array.isArray(response)) workspaces = response;
					else if (response && Array.isArray(response.data)) workspaces = response.data;
					else if (response && response.data && Array.isArray(response.data.workspaces))
						workspaces = response.data.workspaces;
					else if (response && Array.isArray(response.workspaces)) workspaces = response.workspaces;
					else
						throw new NodeOperationError(
							this.getNode(),
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					for (const ws of workspaces) {
						returnData.push({
							name: ws.title || ws.name || ws.id,
							value: ws.id,
						});
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Error loading workspaces: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getDatabases(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-items`,
						json: true,
					});
					let resources = [];
					if (Array.isArray(response)) resources = response;
					else if (response && Array.isArray(response.data)) resources = response.data;
					else if (response && response.data && Array.isArray(response.data.resourceItems))
						resources = response.data.resourceItems;
					else if (response && Array.isArray(response.resourceItems))
						resources = response.resourceItems;
					else
						throw new NodeOperationError(
							this.getNode(),
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					for (const res of resources) {
						if (res.resourceEntity && res.resourceEntity.resourceType === 'database') {
							returnData.push({
								name:
									res.name ||
									(res.resourceEntity.payload && res.resourceEntity.payload.title) ||
									res.id,
								value: res.resourceEntity.resourceId || res.id,
							});
						} else if (res.resourceType === 'database') {
							returnData.push({
								name: res.title || res.name || res.id,
								value: res.id,
							});
						}
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Error loading databases: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getSpaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-spaces`,
						json: true,
					});
					let spaces = [];
					if (Array.isArray(response)) spaces = response;
					else if (response && response.data && Array.isArray(response.data.resourceSpaces))
						spaces = response.data.resourceSpaces;
					else if (response && Array.isArray(response.resourceSpaces)) spaces = response.resourceSpaces;
					else if (response && response.data) spaces = response.data;

					for (const space of spaces) {
						let name = space.name || space.title || space.id;
						returnData.push({
							name: name,
							value: space.id,
						});
					}
				} catch (error) {
					// Intentionally swallow: load options failures should not break the node UI; return whatever was collected so far.
				}
				return returnData;
			},
			async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-items`,
						json: true,
					});
					let resources = [];
					if (Array.isArray(response)) resources = response;
					else if (response && Array.isArray(response.data)) resources = response.data;
					else if (response && response.data && Array.isArray(response.data.resourceItems))
						resources = response.data.resourceItems;
					else if (response && Array.isArray(response.resourceItems))
						resources = response.resourceItems;

					for (const res of resources) {
						const resourceType =
							(res.resourceEntity && res.resourceEntity.resourceType) || res.resourceType;
						if (resourceType !== 'folder') continue;
						const folderId =
							(res.resourceEntity && res.resourceEntity.resourceId) || res.resourceId || res.id;
						const folderName =
							res.name ||
							(res.resourceEntity && res.resourceEntity.payload && res.resourceEntity.payload.name) ||
							folderId;
						returnData.push({
							name: folderName,
							value: folderId,
						});
					}
				} catch (error) {
					// Intentionally swallow: load options failures should not break the node UI.
				}
				return returnData;
			},
			async getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				if (!databaseId) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
						qs: { includeDrafts: 'true' },
						json: true,
					});
					let properties = [];
					if (Array.isArray(response)) properties = response;
					else if (response && Array.isArray(response.data)) properties = response.data;
					else if (response && response.data && Array.isArray(response.data.properties))
						properties = response.data.properties;
					else if (response && Array.isArray(response.properties)) properties = response.properties;
					else
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);
					let operation = '';
					let resource = '';
					try {
						operation = this.getCurrentNodeParameter('operation') as string;
						resource = this.getCurrentNodeParameter('resource') as string;
					} catch (e) {
						// Ignore parameter retrieval errors when context is missing
					}

					for (const prop of properties) {
						let type = String(prop.type || '').toLowerCase();
						if (resource === 'property' && operation === 'delete' && (type === 'name' || prop.title === 'Name')) {
							continue; // Exclude name from delete options
						}
						if (resource === 'item') {
							if (operation === 'create' || operation === 'update') {
								if ([
									'auto-id',
									'files',
									'conversation',
									'comments',
									'time-tracker',
									'formula',
									'created-at',
									'updated-at',
									'teleport',
									'reverse-relation',
									'location',
								].includes(type)) continue;
							} else if (operation === 'uploadFile' || operation === 'deleteFile') {
								if (type !== 'files') continue;
							} else if (operation === 'addMessage') {
								if (type !== 'conversation') continue;
							} else if (operation === 'updateLocation') {
								if (type !== 'location') continue;
							}
						}

						let name = prop.title || prop.name || prop.id;
						if (prop.type) {
							name = `${name} [${prop.type}]`;
						}
						returnData.push({
							name: name,
							value: prop.id,
						});
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Error loading properties: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const databaseId = this.getCurrentNodeParameter('databaseId') as string;
				if (!databaseId) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/views`,
						json: true,
					});

					let views = [];
					if (response && response.data && Array.isArray(response.data.databaseViews)) {
						views = response.data.databaseViews;
					} else if (response && Array.isArray(response.databaseViews)) {
						views = response.databaseViews;
					} else if (Array.isArray(response)) {
						views = response;
					} else {
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);
					}

					for (const view of views) {
						let name = view.name || view.title || view.id;
						if (view.type) {
							name = `${name} [${view.type}]`;
						}
						returnData.push({
							name: name,
							value: view.id,
						});
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Error loading views: ${(error as Error).message}`,
					);
				}
				return returnData;
			},
			async getResourceItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaceIdLoader = this.getCurrentNodeParameter('workspaceIdLoader') as string;
				if (!workspaceIdLoader) return returnData;
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
						method: 'GET',
						url: `https://api.hypris.com/v1/workspace/${workspaceIdLoader}/resource-items`,
						json: true,
					});
					let resources = [];
					if (Array.isArray(response)) resources = response;
					else if (response && Array.isArray(response.data)) resources = response.data;
					else if (response && response.data && Array.isArray(response.data.resourceItems))
						resources = response.data.resourceItems;
					else if (response && Array.isArray(response.resourceItems))
						resources = response.resourceItems;
					else
						throw new Error(
							'Unexpected API response structure:' + JSON.stringify(response).substring(0, 100),
						);

					for (const res of resources) {
						returnData.push({
							name: `[${res.resourceEntity?.resourceType || res.resourceType || 'Resource'}] ${res.name || (res.resourceEntity?.payload?.title) || res.id}`,
							value: res.id,
						});
					}
				} catch (error) {
					throw new Error(`Error loading resource items: ${(error as Error).message}`);
				}
				return returnData;
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Hypris',
		name: 'hypris',
		icon: 'file:hypris.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Hypris API',
		defaults: {
			name: 'Hypris',
			color: '#8016d9',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hyprisApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Database',
						value: 'database',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Property',
						value: 'property',
					},
					{
						name: 'Time Tracker Item',
						value: 'timeTrackerItem',
					},
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
					{
						name: 'Resource Item',
						value: 'resourceItem',
					},
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'item',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an item in a database',
						action: 'Create an item',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete items from a database',
						action: 'Delete an item',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update property/cell values for an item',
						action: 'Update an item',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an item by ID',
						action: 'Get an item',
					},
					{
						name: 'List Items (Filter)',
						value: 'createFilterGroup',
						description: 'List or filter items in a database',
						action: 'List items',
					},
					{
						name: 'Find',
						value: 'findItems',
						description: 'Find items in a database by filtering on a specific column value',
						action: 'Find items in a database',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to a files property of an item',
						action: 'Upload file to item',
					},
					{
						name: 'Delete File',
						value: 'deleteFile',
						description: 'Delete a file from a files property of an item',
						action: 'Delete file from item',
					},
					{
						name: 'Add Conversation Message',
						value: 'addMessage',
						description: 'Send a message to a conversation property of an item',
						action: 'Add message to conversation',
					},
					{
						name: 'Edit Conversation Message',
						value: 'updateMessage',
						description: 'Edit an existing conversation message',
						action: 'Edit conversation message',
					},
					{
						name: 'Update Location',
						value: 'updateLocation',
						description: 'Update a location property with latitude, longitude and address details',
						action: 'Update location of an item',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['property'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a property in a database',
						action: 'Create a property',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Rename a property',
						action: 'Update a property',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get properties of a database',
						action: 'Get many properties',
					},
					{
						name: 'Get Full Data Options',
						value: 'getFullDataOptions',
						description: 'Get complete configuration for a status property',
						action: 'Get full data options for a property',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a property',
						action: 'Delete a property',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
					},
				},
				options: [
					{
						name: 'Update',
						value: 'update',
						description: 'Update start and end times for a time tracker item',
						action: 'Update a time tracker item',
					},
				],
				default: 'update',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['view'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a view in a database',
						action: 'Create a view',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Rename or update a view',
						action: 'Update a view',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a view',
						action: 'Delete a view',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAllWorkspaces',
						description: 'Get many workspaces for the current user',
						action: 'Get many workspaces',
					},
					{
						name: 'Create',
						value: 'createWorkspace',
						description: 'Create a new workspace',
						action: 'Create a workspace',
					},
					{
						name: 'Get Resources',
						value: 'getResources',
						description: 'Get all resources from a workspace',
						action: 'Get resources from a workspace',
					},
				],
				default: 'getAllWorkspaces',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
					},
				},
				options: [
					{
						name: 'Rename',
						value: 'rename',
						description: 'Rename a resource item/database',
						action: 'Rename a resource item',
					},
				],
				default: 'rename',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['database'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new database',
						action: 'Create a database',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many databases in a workspace',
						action: 'Get many databases',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a database',
						action: 'Delete a database',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getManyFiles',
						description: 'List files and sub-folders inside a folder',
						action: 'Get many files in a folder',
					},
					{
						name: 'Rename',
						value: 'renameCloudItem',
						description: 'Rename a file or sub-folder (cloud item)',
						action: 'Rename a file',
					},
					{
						name: 'Move to Folder',
						value: 'moveToFolder',
						description: 'Move a cloud item into another sub-folder (catalog) within the same root folder',
						action: 'Move a file to another sub-folder',
					},
					{
						name: 'Move to Root',
						value: 'moveToRoot',
						description: 'Move a cloud item to the root level of its folder (out of any sub-folder)',
						action: 'Move a file to folder root',
					},
				],
				default: 'getManyFiles',
			},
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceIdLoader',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				default: '',
				description:
					'Select a workspace to automatically load its databases below. You can leave this empty if you enter the Database ID manually.',
				displayOptions: {
					show: {
						resource: ['item', 'property', 'view', 'resourceItem', 'workspace', 'database', 'file'],
						operation: [
							'create',
							'delete',
							'update',
							'createFilterGroup',
							'findItems',
							'getMany',
							'getManyFiles',
							'moveToRoot',
							'getFullDataOptions',
							'rename',
							'getResources',
							'getAll',
							'updateLocation',
						],
					},
				},
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: [
							'create',
							'delete',
							'update',
							'createFilterGroup',
							'findItems',
							'uploadFile',
							'addMessage',
							'updateLocation',
						],
					},
				},
				placeholder: '69b7dc893bdd1bad9241263f',
				description: 'The ID of the database or select one from the list',
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property', 'view'],
						operation: ['create', 'getMany', 'delete', 'update', 'getFullDataOptions'],
					},
				},
				placeholder: '69b7dc893bdd1bad9241263f',
				description: 'The ID of the database or select one from the list',
			},
			{
				displayName: 'Database Name or ID',
				name: 'databaseId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['getMany', 'update', 'getFullDataOptions'],
					},
				},
				placeholder: '69b7dc893bdd1bad9241263f',
				description: 'The ID of the database or select one from the list',
			},
			{
				displayName: 'Databases to Delete',
				name: 'databaseIdsToDelete',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDatabases',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: [],
				required: true,
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['delete'],
					},
				},
				description: 'Select the databases to delete',
			},
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['get', 'update', 'uploadFile', 'addMessage', 'updateLocation'],
					},
				},
				placeholder: '69c123...abc',
				description: 'The unique ID of the item to interact with',
			},
			{
				displayName: 'Location Property Name or ID',
				name: 'locationPropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'The location property to update. Only location properties are shown here.',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'The latitude coordinate (e.g. 53.00969)',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'The longitude coordinate (e.g. 18.61589)',
			},
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'The formatted address string (e.g. "10 Downing Street, London")',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'Optional address component: Country',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'Optional address component: City',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'Optional address component: Street',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateLocation'],
					},
				},
				description: 'Optional address component: Postal Code',
			},
			{
				displayName: 'Item Name',
				name: 'itemName',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [false],
					},
				},
				description: 'The explicit name of the item. Leave empty to use default or mapped properties.',
			},
			{
				displayName: 'Item IDs to Delete',
				name: 'itemIds',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['delete'],
					},
				},
				placeholder: '69c1..., 69c2...',
				description: 'Comma separated list of Item IDs to delete from the selected database',
			},
			{
				displayName: 'Property Name or ID',
				name: 'propertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update', 'getFullDataOptions'],
					},
				},
				description: 'Select the property or enter its ID',
			},
			{
				displayName: 'Properties to Delete',
				name: 'propertyIdsToDelete',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['delete'],
					},
				},
				description: 'Select the properties to delete',
			},
			{
				displayName: 'Time Tracker Item ID',
				name: 'timeTrackerItemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				placeholder: '69d567...f01',
				description: 'The unique ID of the time tracker item to update',
			},
			{
				displayName: 'View Name or ID',
				name: 'viewId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getViews',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'Select the view or enter its ID',
			},
			{
				displayName: 'Views to Delete',
				name: 'viewIdsToDelete',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getViews',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				required: true,
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['delete'],
					},
				},
				description: 'Select the views to delete',
			},
			{
				displayName: 'Resource Item Name or ID',
				name: 'resourceItemId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getResourceItems',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
						operation: ['rename'],
					},
				},
				description: 'Select the resource item or enter its ID to rename',
			},
			{
				displayName: 'New Name',
				name: 'newName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['resourceItem'],
						operation: ['rename'],
					},
				},
				placeholder: 'My New Property Name',
				description: 'Enter the new name for the resource item selected above',
			},
			{
				displayName: 'Include Drafts',
				name: 'includeDrafts',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['getMany'],
					},
				},
				description: 'Whether to include draft properties',
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
					},
				},
				description: 'Whether to pass the parameters as raw JSON (advanced)',
			},
			{
				displayName: 'Properties',
				name: 'properties',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [false],
					},
				},
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'propertyId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getProperties',
									loadOptionsDependsOn: ['databaseId'],
								},
								default: '',
								description: 'Select the property to set the value for',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description:
									'The value to set. For advanced values like arrays, use Expressions to return an array or switch to JSON Parameters.',
							},
						],
					},
				],
			},
			{
				displayName: 'Auto-Create Missing Status/Dropdown Options',
				name: 'autoCreateOptions',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [false],
					},
				},
				description:
					'Whether to automatically create status or dropdown labels if the provided string value does not already exist in the database property',
			},
			{
				displayName: 'Content (Raw JSON)',
				name: 'jsonContent',
				type: 'json',
				default: '{\n  "cellValues": {}\n}',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'update'],
						jsonParameters: [true],
					},
				},
				placeholder: '{\n  "cellValues": {\n    "myPropId": "myValue"\n  }\n}',
				description: 'The JSON payload containing property values indexed by their Property IDs',
			},
			{
				displayName: 'Property Name or ID',
				name: 'filePropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId', 'operation'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['uploadFile'],
					},
				},
				description: 'Select the Files property',
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['uploadFile'],
					},
				},
				description: 'Name of the binary property to upload (e.g. data)',
			},
			{
				displayName: 'File ID to Delete',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['deleteFile'],
					},
				},
				description: 'The ID of the file to delete (e.g. 69dc...b10)',
			},
			{
				displayName: 'Property Name or ID',
				name: 'conversationPropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId', 'operation'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['addMessage'],
					},
				},
				description: 'Select the Conversation property',
			},
			{
				displayName: 'Message Content',
				name: 'messageContent',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['addMessage', 'updateMessage'],
					},
				},
				description: 'The content of your message',
			},
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['updateMessage'],
					},
				},
				placeholder: '69e890...abc',
				description: 'The unique ID of the conversation message to edit',
			},
			{
				displayName: 'Started At',
				name: 'startedAt',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				description: 'The start time of the time tracker item',
			},
			{
				displayName: 'Ended At',
				name: 'endedAt',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['timeTrackerItem'],
						operation: ['update'],
					},
				},
				description: 'The end time of the time tracker item',
			},
			{
				displayName: 'Views to Create',
				name: 'viewsList',
				placeholder: 'Add View',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'viewValues',
						displayName: 'View',
						values: [
							{
								displayName: 'View Title',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: 'Name of the new view',
							},
							{
								displayName: 'View Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Table', value: 'table' },
									{ name: 'Calendar', value: 'calendar' },
									{ name: 'Timeline', value: 'timeline' },
									{ name: 'Kanban', value: 'kanban' },
									{ name: 'Map', value: 'map' },
									{ name: 'Form', value: 'form' },
								],
								default: 'table',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'View Title',
				name: 'viewTitle',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'New name for the view',
			},
			{
				displayName: 'View Type',
				name: 'viewType',
				type: 'options',
				options: [
					{ name: 'Table', value: 'table' },
					{ name: 'Calendar', value: 'calendar' },
					{ name: 'Timeline', value: 'timeline' },
					{ name: 'Kanban', value: 'kanban' },
					{ name: 'Map', value: 'map' },
					{ name: 'Form', value: 'form' },
				],
				default: 'table',
				displayOptions: {
					show: {
						resource: ['view'],
						operation: ['update'],
					},
				},
				description: 'New type for the view',
			},
			{
				displayName: 'Workspace Title',
				name: 'workspaceTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['createWorkspace'],
					},
				},
				description: 'The display title for the workspace (e.g. My Workspace)',
			},
			{
				displayName: 'Workspace Type',
				name: 'workspaceType',
				type: 'options',
				options: [
					{ name: 'Team', value: 'team' },
					{ name: 'Private', value: 'private' },
				],
				default: 'team',
				displayOptions: {
					show: {
						resource: ['workspace'],
						operation: ['createWorkspace'],
					},
				},
				description: 'The type of workspace',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['createFilterGroup', 'findItems'],
					},
				},
				description: 'Max number of items to fetch',
			},
			{
				displayName: 'Columns to Fetch',
				name: 'databasePropertyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: [],
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['createFilterGroup', 'findItems'],
					},
				},
				description:
					'Select which columns to fetch. Leave empty to automatically fetch all properties.',
			},
			{
				displayName: 'Search Column Name or ID',
				name: 'searchPropertyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProperties',
					loadOptionsDependsOn: ['databaseId'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['findItems'],
					},
				},
				description:
					'The property/column to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Operator',
				name: 'searchOperator',
				type: 'options',
				options: [
					{ name: 'Equals', value: 'equals' },
					{ name: 'Not Equals', value: 'not-equals' },
					{ name: 'Contains', value: 'contains' },
					{ name: 'Starts With', value: 'starts-with' },
					{ name: 'Ends With', value: 'ends-with' },
					{ name: 'Greater Than', value: 'greater-than' },
					{ name: 'Less Than', value: 'less-than' },
					{ name: 'Array Includes', value: 'array-includes' },
				],
				default: 'equals',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['findItems'],
					},
				},
				description: 'How to match the value against the selected column',
			},
			{
				displayName: 'Search Value',
				name: 'searchValue',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['findItems'],
					},
				},
				description: 'The value to match against the selected column',
			},
			{
				displayName: 'Property Title',
				name: 'propertyTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update'],
					},
				},
				description: 'The title/name of the property',
			},
			{
				displayName: 'Property Type',
				name: 'propertyType',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'Rich Text', value: 'rich-text' },
					{ name: 'Auto ID', value: 'auto-id' },
					{ name: 'Number', value: 'number' },
					{ name: 'People', value: 'people' },
					{ name: 'Rating', value: 'rating' },
					{ name: 'Status', value: 'status' },
					{ name: 'Dropdown', value: 'dropdown' },
					{ name: 'Time Tracker', value: 'time-tracker' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Mail', value: 'mail' },
					{ name: 'Location', value: 'location' },
					{ name: 'Link', value: 'link' },
					{ name: 'Relation', value: 'relation' },
					{ name: 'Reverse-Relation', value: 'reverse-relation' },
					{ name: 'Teleport', value: 'teleport' },
					{ name: 'Formula', value: 'formula' },
				],
				default: 'text',
				required: true,
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['update'], // we can hide it entirely or keep for later if needed, but it's replaced by propertiesList for create
					},
				},
				description: 'The type of the property',
			},
			{
				displayName: 'Properties to Create',
				name: 'propertiesList',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Title',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								description: 'Name of the new property',
							},
							{
								displayName: 'Property Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'Rich Text', value: 'rich-text' },
									{ name: 'Auto ID', value: 'auto-id' },
									{ name: 'Number', value: 'number' },
									{ name: 'People', value: 'people' },
									{ name: 'Rating', value: 'rating' },
									{ name: 'Status', value: 'status' },
									{ name: 'Dropdown', value: 'dropdown' },
									{ name: 'Time Tracker', value: 'time-tracker' },
									{ name: 'Phone', value: 'phone' },
									{ name: 'Mail', value: 'mail' },
									{ name: 'Location', value: 'location' },
									{ name: 'Link', value: 'link' },
									{ name: 'Relation', value: 'relation' },
									{ name: 'Reverse-Relation', value: 'reverse-relation' },
									{ name: 'Teleport', value: 'teleport' },
									{ name: 'Formula', value: 'formula' },
									{ name: 'Date', value: 'date' },
									{ name: 'Files', value: 'files' },
									{ name: 'Comments', value: 'comments' },
									{ name: 'Created At', value: 'created-at' },
									{ name: 'Updated At', value: 'updated-at' },
								],
								default: 'text',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Database Title',
				name: 'dbTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['create'],
					},
				},
				description: 'Name of the database',
			},
			{
				displayName: 'Resource Space Name or ID',
				name: 'resourceSpaceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSpaces',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['create'],
					},
				},
				description:
					'Select a Space where the database should be created. Requires selecting a Workspace above first.',
			},
			{
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFolders',
					loadOptionsDependsOn: ['workspaceIdLoader'],
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['getManyFiles', 'moveToRoot'],
					},
				},
				description:
					'Select a folder from the workspace above, or enter a folder ID manually. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['getManyFiles'],
					},
				},
				description: 'Max number of items to return',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['getManyFiles'],
					},
				},
				options: [
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						typeOptions: { minValue: 0 },
						default: 0,
						description: 'Number of items to skip before returning results',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description: 'Filter results by name (case-insensitive substring)',
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{ name: 'Created At', value: 'createdAt' },
							{ name: 'Name', value: 'name' },
							{ name: 'Size', value: 'size' },
							{ name: 'Type', value: 'type' },
						],
						default: 'createdAt',
						description: 'Field to sort by',
					},
					{
						displayName: 'Sort Direction',
						name: 'sortDirection',
						type: 'options',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						default: 'desc',
						description: 'Sort direction',
					},
				],
			},
			{
				displayName: 'Cloud Item ID',
				name: 'cloudItemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['renameCloudItem', 'moveToFolder', 'moveToRoot'],
					},
				},
				placeholder: '69f36320...d839',
				description: 'The ID of the file or sub-folder. Copy it from a Get Many response.',
			},
			{
				displayName: 'New Name',
				name: 'cloudItemNewName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['renameCloudItem'],
					},
				},
				description: 'The new name for the file or sub-folder',
			},
			{
				displayName: 'Target Parent Cloud Item ID',
				name: 'targetParentCloudItemId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['moveToFolder'],
					},
				},
				placeholder: '69f36b9f...e4bb',
				description: 'The ID of the destination sub-folder (cloud item of type catalog). Copy it from a Get Many response.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const dbPropertiesCache: { [key: string]: any[] } = {};
		const dbInfoCache: { [key: string]: any } = {};

		const processFixedCollectionProperties = async (
			thisArg: IExecuteFunctions,
			properties: any,
			databaseId: string,
			autoCreateOptions: boolean,
			body: any,
		) => {
			body.cellValues = {};
			if (!properties || !properties.propertyValues) return;
			if (!dbPropertiesCache[databaseId]) {
				const propsResponse = await thisArg.helpers.httpRequestWithAuthentication.call(
					thisArg,
					'hyprisApi',
					{
						method: 'GET',
						url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
						qs: { includeDrafts: 'true' },
						json: true,
					},
				);
				dbPropertiesCache[databaseId] = Array.isArray(propsResponse)
					? propsResponse
					: propsResponse?.data?.properties ||
						propsResponse?.properties ||
						propsResponse?.data ||
						[];
			}
			const dbProps = dbPropertiesCache[databaseId];
			for (const prop of properties.propertyValues) {
				let finalValue = prop.value;
				const propMeta = dbProps.find((p: any) => p.id === prop.propertyId);
				if (propMeta && (propMeta.type === 'status' || propMeta.type === 'dropdown')) {
					const isStatus = propMeta.type === 'status';
					const optResponse = await thisArg.helpers.httpRequestWithAuthentication.call(
						thisArg,
						'hyprisApi',
						{
							method: 'GET',
							url: `https://api.hypris.com/v1/property/${prop.propertyId}/${isStatus ? 'statuses' : 'labels'}`,
							json: true,
						},
					);
					const optionsList = Array.isArray(optResponse)
						? optResponse
						: optResponse?.data?.labels ||
							optResponse?.labels ||
							optResponse?.data?.statuses ||
							optResponse?.statuses ||
							optResponse?.data ||
							[];
					const strVal = String(finalValue).trim().toLowerCase();
					const match = optionsList.find(
						(o: any) =>
							String(o.id) === strVal ||
							String(o.title || o.name || '')
								.trim()
								.toLowerCase() === strVal,
					);

					if (match) {
						finalValue = isStatus ? match.id : [match.id];
					} else if (autoCreateOptions && String(finalValue).trim() !== '') {
						const postBody: any = { title: String(finalValue).trim() };
						if (!isStatus) {
							postBody.position = 0;
							postBody.color = { colorType: 'palette', payload: 13 };
						}
						const createResp = await thisArg.helpers.httpRequestWithAuthentication.call(
							thisArg,
							'hyprisApi',
							{
								method: 'POST',
								url: `https://api.hypris.com/v1/property/${prop.propertyId}/${isStatus ? 'status' : 'label'}`,
								body: postBody,
								json: true,
							},
						);
						let extractedId =
							createResp?.data?.status?.id ||
							createResp?.data?.label?.id ||
							createResp?.data?.id ||
							createResp?.id ||
							finalValue;
						finalValue = isStatus ? extractedId : [extractedId];
					}
				} else if (propMeta && (propMeta.type === 'number' || propMeta.type === 'rating')) {
					if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
						finalValue = Number(finalValue);
					}
				} else if (
					propMeta &&
					(propMeta.type === 'relation' ||
						propMeta.type === 'reverse-relation' ||
						propMeta.type === 'people')
				) {
					if (typeof finalValue === 'string') {
						if (finalValue.includes(',')) {
							finalValue = finalValue
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s);
						} else if (
							finalValue.trim() !== '' &&
							!finalValue.trim().startsWith('{') &&
							!finalValue.trim().startsWith('[')
						) {
							finalValue = [finalValue.trim()];
						}
					}
				} else if (propMeta && propMeta.type === 'date') {
					if (typeof finalValue === 'string') {
						finalValue = finalValue.trim();
						if (finalValue.startsWith('{')) {
							try {
								finalValue = JSON.parse(finalValue);
							} catch (e) {
								// Not valid JSON; fall through and treat as a plain date string below.
							}
						} else if (finalValue) {
							let dateStr = finalValue;
							let timeStr = null;
							
							const dateMatch = finalValue.match(/^(\d{4}-\d{2}-\d{2})/);
							if (dateMatch) {
								dateStr = dateMatch[1];
								const timeMatch = finalValue.match(/T(\d{2}:\d{2})| (\d{2}:\d{2})/);
								if (timeMatch) {
									timeStr = timeMatch[1] || timeMatch[2];
								}
							}
							
							finalValue = {
								from: {
									date: dateStr,
									time: timeStr
								},
								to: {
									date: null,
									time: null
								}
							};
						} else {
							finalValue = null; // empty string -> clear date
						}
					}
				}

				// Safely parse JSON strings (handling accidental extra quotes)
				if (typeof finalValue === 'string') {
					finalValue = finalValue.trim().replace(/^"|"$/g, '');
					if (
						(finalValue.startsWith('{') && finalValue.endsWith('}')) ||
						(finalValue.startsWith('[') && finalValue.endsWith(']'))
					) {
						try {
							finalValue = JSON.parse(finalValue);
						} catch (e) {
							// Fallback to string if parsing fails
						}
					}
				}

				// Handle plain text URLs for link fields by auto-wrapping them
				if (propMeta && propMeta.type === 'link') {
					if (typeof finalValue === 'string') {
						finalValue = { url: finalValue };
					}
				}
				body.cellValues[prop.propertyId] = finalValue;
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let options: IHttpRequestOptions | undefined;

				if (resource === 'item') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						let body: any = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i, false) as boolean;
						if (jsonParameters) {
							const jsonContentStr = this.getNodeParameter('jsonContent', i) as string;
							try {
								body = JSON.parse(jsonContentStr);
							} catch (e) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON: ${(e as Error).message}`,
									{ itemIndex: i },
								);
							}
						} else {
							const properties = this.getNodeParameter('properties', i, {}) as any;
							const autoCreateOptions = this.getNodeParameter(
								'autoCreateOptions',
								i,
								true,
							) as boolean;
							await processFixedCollectionProperties(
								this,
								properties,
								databaseId,
								autoCreateOptions,
								body,
							);
							
							const itemName = this.getNodeParameter('itemName', i, '') as string;
							if (itemName) {
								if (!dbInfoCache[databaseId]) {
									try {
										const dbInfoResp = await this.helpers.httpRequestWithAuthentication.call(
											this,
											'hyprisApi',
											{
												method: 'GET',
												url: `https://api.hypris.com/v1/database/${databaseId}`,
												json: true,
											},
										);
										dbInfoCache[databaseId] = dbInfoResp?.data?.database || dbInfoResp?.database || {};
									} catch (e) {
										// Ignore db fetch error
									}
								}
								const namePropertyId = dbInfoCache[databaseId]?.namePropertyId;
								if (namePropertyId) {
									body.cellValues = body.cellValues || {};
									body.cellValues[namePropertyId] = itemName;
								}
							}
							
							body.state = 'published';
						}

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/database/${databaseId}/item`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const itemIdsStr = this.getNodeParameter('itemIds', i) as string;
						const databaseItemIds = itemIdsStr
							.split(',')
							.map((id) => id.trim())
							.filter((id) => id);

						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/database/${databaseId}/items`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { databaseItemIds },
							json: true,
						};
					} else if (operation === 'update') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						let body: any = {};
						const jsonParameters = this.getNodeParameter('jsonParameters', i, false) as boolean;
						if (jsonParameters) {
							const jsonContentStr = this.getNodeParameter('jsonContent', i) as string;
							try {
								body = JSON.parse(jsonContentStr);
							} catch (e) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON: ${(e as Error).message}`,
									{ itemIndex: i },
								);
							}
						} else {
							const databaseId = this.getNodeParameter('databaseId', i) as string;
							const properties = this.getNodeParameter('properties', i, {}) as any;
							const autoCreateOptions = this.getNodeParameter(
								'autoCreateOptions',
								i,
								true,
							) as boolean;
							await processFixedCollectionProperties(
								this,
								properties,
								databaseId,
								autoCreateOptions,
								body,
							);

							const itemName = this.getNodeParameter('itemName', i, '') as string;
							if (itemName) {
								if (!dbInfoCache[databaseId]) {
									try {
										const dbInfoResp = await this.helpers.httpRequestWithAuthentication.call(
											this,
											'hyprisApi',
											{
												method: 'GET',
												url: `https://api.hypris.com/v1/database/${databaseId}`,
												json: true,
											},
										);
										dbInfoCache[databaseId] = dbInfoResp?.data?.database || dbInfoResp?.database || {};
									} catch (e) {
										// Ignore db fetch error
									}
								}
								const namePropertyId = dbInfoCache[databaseId]?.namePropertyId;
								if (namePropertyId) {
									body.cellValues = body.cellValues || {};
									body.cellValues[namePropertyId] = itemName;
								}
							}
						}

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/item/${itemId}/cell-values`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'updateLocation') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const locationPropertyId = this.getNodeParameter('locationPropertyId', i) as string;
						const latitude = this.getNodeParameter('latitude', i, 0) as number;
						const longitude = this.getNodeParameter('longitude', i, 0) as number;
						const address = this.getNodeParameter('address', i, '') as string;
						const country = this.getNodeParameter('country', i, '') as string;
						const city = this.getNodeParameter('city', i, '') as string;
						const street = this.getNodeParameter('street', i, '') as string;
						const postalCode = this.getNodeParameter('postalCode', i, '') as string;

						const locationValue = {
							address: address,
							displayAddress: address,
							coordinates: [longitude, latitude],
							addressComponents: {
								country: country,
								state: null,
								county: null,
								commune: null,
								city: city,
								street: street,
								postalCode: postalCode
							}
						};

						const body = {
							cellValues: {
								[locationPropertyId]: locationValue
							}
						};

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/item/${itemId}/cell-values`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'createFilterGroup') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const limit = this.getNodeParameter('limit', i, 100) as number;
						let databasePropertyIds = this.getNodeParameter(
							'databasePropertyIds',
							i,
							[],
						) as string[];

						if (!databasePropertyIds || databasePropertyIds.length === 0) {
							if (!dbPropertiesCache[databaseId]) {
								const propsResp = await this.helpers.httpRequestWithAuthentication.call(
									this,
									'hyprisApi',
									{
										method: 'GET',
										url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
										json: true,
									},
								);
								dbPropertiesCache[databaseId] = Array.isArray(propsResp)
									? propsResp
									: propsResp?.data?.properties || propsResp?.properties || propsResp?.data || [];
							}
							databasePropertyIds = dbPropertiesCache[databaseId].map((p: any) => p.id);
						}

						const body = {
							filterGroups: [{ offset: 0, limit: limit, filter: null }],
							databasePropertyIds: databasePropertyIds,
						};

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/database/${databaseId}/items/filter-groups`,
							qs: { sortDirection: '1' },
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'findItems') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const limit = this.getNodeParameter('limit', i, 100) as number;
						const searchPropertyId = this.getNodeParameter('searchPropertyId', i) as string;
						const searchOperator = this.getNodeParameter(
							'searchOperator',
							i,
							'equals',
						) as string;
						const searchValue = this.getNodeParameter('searchValue', i) as string;
						let databasePropertyIds = this.getNodeParameter(
							'databasePropertyIds',
							i,
							[],
						) as string[];

						if (!databasePropertyIds || databasePropertyIds.length === 0) {
							if (!dbPropertiesCache[databaseId]) {
								const propsResp = await this.helpers.httpRequestWithAuthentication.call(
									this,
									'hyprisApi',
									{
										method: 'GET',
										url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
										json: true,
									},
								);
								dbPropertiesCache[databaseId] = Array.isArray(propsResp)
									? propsResp
									: propsResp?.data?.properties || propsResp?.properties || propsResp?.data || [];
							}
							databasePropertyIds = dbPropertiesCache[databaseId].map((p: any) => p.id);
						}

						const body = {
							filterGroups: [
								{
									offset: 0,
									limit,
									filter: {
										type: 'property',
										id: searchPropertyId,
										operator: { type: searchOperator },
										payload: { type: 'static', value: searchValue },
										isDisabled: false,
									},
								},
							],
							databasePropertyIds,
						};

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/database/${databaseId}/items/filter-groups`,
							qs: { sortDirection: '1' },
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'uploadFile') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const filePropertyId = this.getNodeParameter('filePropertyId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/item/${itemId}/property/${filePropertyId}/file`,
							headers: { Accept: 'application/json' },
							formData: {
								file: {
									value: fileBuffer,
									options: {
										filename: binaryData.fileName,
										contentType: binaryData.mimeType,
									},
								},
							},
						} as any;
					} else if (operation === 'deleteFile') {
						const fileId = this.getNodeParameter('fileId', i) as string;
						options = {
							method: 'DELETE',
							url: `https://api.hypris.com/v1/database-item-file/${fileId}`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'addMessage') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const conversationPropertyId = this.getNodeParameter(
							'conversationPropertyId',
							i,
						) as string;
						const messageContent = this.getNodeParameter('messageContent', i) as string;

						const payload = {
							content: [{ type: 'paragraph', content: [{ type: 'text', text: messageContent }] }],
							conversationTypePayload: {
								databasePropertyId: conversationPropertyId,
								databaseItemId: itemId,
							},
							state: 'sent',
							replyMessageId: null,
						};
						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/conversation-type/database-cell/message`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: payload,
							json: true,
						};
					} else if (operation === 'updateMessage') {
						const messageId = this.getNodeParameter('messageId', i) as string;
						const messageContent = this.getNodeParameter('messageContent', i) as string;

						const payload = {
							content: [{ type: 'paragraph', content: [{ type: 'text', text: messageContent }] }],
						};
						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/message/${messageId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: payload,
							json: true,
						};
					} else if (operation === 'get') {
						const itemId = this.getNodeParameter('itemId', i) as string;

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/item/${itemId}`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				} else if (resource === 'property') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const propertiesList = this.getNodeParameter('propertiesList', i, {
							propertyValues: [],
						}) as any;

						const createdProps = [];
						for (const prop of propertiesList.propertyValues || []) {
							const body = { title: prop.title, type: prop.type, state: 'published' };

							try {
								const res = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
									method: 'POST',
									url: `https://api.hypris.com/v1/database/${databaseId}/property`,
									body,
									json: true,
								});
								if (res?.data?.property) {
									createdProps.push({
										propertyId: res.data.property.id,
										title: res.data.property.title,
										type: res.data.property.type,
									});
								}
							} catch (e: any) {
								throw new NodeApiError(this.getNode(), e as JsonObject);
							}
						}

						if (createdProps.length > 0) {
							returnData.push({ json: { createdProperties: createdProps } });
						} else {
							returnData.push({ json: { success: true } });
						}
						continue;
					} else if (operation === 'delete') {
						const propertyIdsToDelete = this.getNodeParameter('propertyIdsToDelete', i) as any;
						const propertyIds = Array.isArray(propertyIdsToDelete)
							? propertyIdsToDelete
							: [propertyIdsToDelete];

						for (const propId of propertyIds) {
							try {
								await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
									method: 'DELETE',
									url: `https://api.hypris.com/v1/property/${propId}`,
									json: true,
								});
							} catch (e: any) {
								throw new NodeApiError(this.getNode(), e as JsonObject);
							}
						}

						returnData.push({ json: { success: true } });
						continue;
					} else if (operation === 'update') {
						const propertyId = this.getNodeParameter('propertyId', i) as string;
						const title = this.getNodeParameter('propertyTitle', i) as string;

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/property/${propertyId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { title },
							json: true,
						};
					} else if (operation === 'getMany') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const includeDrafts = this.getNodeParameter('includeDrafts', i) as boolean;

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/database/${databaseId}/properties`,
							qs: { includeDrafts: includeDrafts.toString() },
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'getFullDataOptions') {
						const propertyId = this.getNodeParameter('propertyId', i) as string;

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/property/${propertyId}/full-data-options`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				} else if (resource === 'view') {
					if (operation === 'create') {
						const databaseId = this.getNodeParameter('databaseId', i) as string;
						const viewsList = this.getNodeParameter('viewsList', i, { viewValues: [] }) as any;

						const createdViews = [];
						for (const view of viewsList.viewValues || []) {
							const body = { name: view.title, type: view.type };

							try {
								const res = await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
									method: 'POST',
									url: `https://api.hypris.com/v1/database/${databaseId}/view`,
									body,
									json: true,
								});
								if (res?.data?.databaseView) {
									createdViews.push({
										viewId: res.data.databaseView.id,
										name: res.data.databaseView.name,
										type: res.data.databaseView.type,
										createdAt: res.data.databaseView.createdAt,
									});
								}
							} catch (e: any) {
								throw new NodeApiError(this.getNode(), e as JsonObject);
							}
						}

						if (createdViews.length > 0) {
							returnData.push({ json: { createdViews: createdViews } });
						} else {
							returnData.push({ json: { success: true } });
						}
						continue;
					} else if (operation === 'update') {
						const viewId = this.getNodeParameter('viewId', i) as string;
						const viewTitle = this.getNodeParameter('viewTitle', i, '') as string;
						const viewType = this.getNodeParameter('viewType', i, '') as string;

						const body: any = {};
						if (viewTitle) body.name = viewTitle;
						if (viewType) body.type = viewType;

						options = {
							method: 'PATCH',
							url: `https://api.hypris.com/v1/view/${viewId}`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const viewIdsToDelete = this.getNodeParameter('viewIdsToDelete', i) as any;
						const viewIds = Array.isArray(viewIdsToDelete) ? viewIdsToDelete : [viewIdsToDelete];
						for (const viewId of viewIds) {
							try {
								await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
									method: 'DELETE',
									url: `https://api.hypris.com/v1/view/${viewId}`,
									headers: { Accept: 'application/json' },
									json: true,
								});
							} catch (e: any) {
								throw new NodeApiError(this.getNode(), e as JsonObject);
							}
						}

						returnData.push({ json: { success: true } });
						continue;
					}
				} else if (resource === 'workspace') {
					if (operation === 'getAllWorkspaces') {
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/me/workspaces`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'createWorkspace') {
						const workspaceTitle = this.getNodeParameter('workspaceTitle', i) as string;
						const workspaceType = this.getNodeParameter('workspaceType', i, 'team') as string;

						// Auto-generate slug because the API always requires it
						let autoName = workspaceTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
						if (autoName.length < 3) autoName = autoName + '-ws';

						let body: any = {
							title: workspaceTitle,
							name: autoName,
							type: workspaceType,
						};

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/workspace`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'getResources') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/resource-items`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					}
				} else if (resource === 'resourceItem') {
					if (operation === 'rename') {
						const resourceItemId = this.getNodeParameter('resourceItemId', i) as string;
						const newName = this.getNodeParameter('newName', i) as string;
						options = {
							method: 'PUT',
							url: `https://api.hypris.com/v1/resource-item/${resourceItemId}/name`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { name: newName },
							json: true,
						};
					}
				} else if (resource === 'file') {
					if (operation === 'getManyFiles') {
						const folderId = this.getNodeParameter('folderId', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const additional = this.getNodeParameter('additionalOptions', i, {}) as {
							offset?: number;
							search?: string;
							sort?: string;
							sortDirection?: string;
						};

						const qs: any = {
							offset: typeof additional.offset === 'number' ? additional.offset : 0,
							limit,
							search: additional.search ?? '',
							sort: additional.sort ?? 'createdAt',
							sortDirection: additional.sortDirection ?? 'desc',
						};

						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/folder/${folderId}/items`,
							qs,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'renameCloudItem') {
						const cloudItemId = this.getNodeParameter('cloudItemId', i) as string;
						const newName = this.getNodeParameter('cloudItemNewName', i) as string;
						options = {
							method: 'PUT',
							url: `https://api.hypris.com/v1/cloud-item/${cloudItemId}/name`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { name: newName },
							json: true,
						};
					} else if (operation === 'moveToFolder') {
						const cloudItemId = this.getNodeParameter('cloudItemId', i) as string;
						const targetParentCloudItemId = this.getNodeParameter(
							'targetParentCloudItemId',
							i,
						) as string;
						options = {
							method: 'PUT',
							url: `https://api.hypris.com/v1/cloud-item/${cloudItemId}/parent-cloud-item-id`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { parentCloudItemId: targetParentCloudItemId },
							json: true,
						};
					} else if (operation === 'moveToRoot') {
						const cloudItemId = this.getNodeParameter('cloudItemId', i) as string;
						const folderId = this.getNodeParameter('folderId', i) as string;
						options = {
							method: 'PUT',
							url: `https://api.hypris.com/v1/cloud-item/${cloudItemId}/parent-cloud-item-id`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body: { parentCloudItemId: folderId },
							json: true,
						};
					}
				} else if (resource === 'database') {
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						options = {
							method: 'GET',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/resource-items`,
							headers: { Accept: 'application/json' },
							json: true,
						};
					} else if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceIdLoader', i) as string;
						const dbTitle = this.getNodeParameter('dbTitle', i) as string;
						let resourceSpaceId = this.getNodeParameter('resourceSpaceId', i, '') as string;

						if (!resourceSpaceId) {
							throw new Error('You must explicitly select a Resource Space to create a database.');
						}

						const body: any = {
							title: dbTitle,
						};
						if (resourceSpaceId) body.resourceSpaceId = resourceSpaceId;

						options = {
							method: 'POST',
							url: `https://api.hypris.com/v1/workspace/${workspaceId}/database`,
							headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
							body,
							json: true,
						};
					} else if (operation === 'delete') {
						const databaseIdsToDelete = this.getNodeParameter('databaseIdsToDelete', i) as any;
						const databaseIds = Array.isArray(databaseIdsToDelete) 
							? databaseIdsToDelete 
							: [databaseIdsToDelete];
							
						for (const dbId of databaseIds) {
							await this.helpers.httpRequestWithAuthentication.call(this, 'hyprisApi', {
								method: 'DELETE',
								url: `https://api.hypris.com/v1/database/${dbId}`,
								headers: { Accept: 'application/json' },
								json: true,
							});
						}
						
						returnData.push({ json: { success: true } });
						continue;
					}
				}

				if (options) {

					const responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'hyprisApi',
						options,
					);


					let data = responseData;
					if (
						typeof responseData === 'string' ||
						responseData === undefined ||
						responseData === null
					) {
						data = {
							success: true,
							message:
								responseData !== undefined ? responseData : 'Successful with no response body',
						};
					} else if (resource === 'database' && operation === 'getAll') {
						let resources = [];
						if (Array.isArray(responseData)) resources = responseData;
						else if (responseData && Array.isArray(responseData.data))
							resources = responseData.data;
						else if (
							responseData &&
							responseData.data &&
							Array.isArray(responseData.data.resourceItems)
						)
							resources = responseData.data.resourceItems;
						else if (responseData && Array.isArray(responseData.resourceItems))
							resources = responseData.resourceItems;

						const databases = resources
							.filter(
								(item: any) =>
									item.resourceType === 'database' ||
									(item.resourceEntity && item.resourceEntity.resourceType === 'database'),
							)
							.map((item: any) => {
								const payload = item.resourceEntity?.payload || {};
								return {
									databaseId: item.resourceEntity?.resourceId || item.id,
									title: payload.title || item.name,
									workspaceId: item.workspaceId,
									createdAt: payload.createdAt,
								};
							});
						
						returnData.push(...databases.map((db: any) => ({ json: db })));
						continue;
					} else if (
						resource === 'file' &&
						(operation === 'renameCloudItem' ||
							operation === 'moveToFolder' ||
							operation === 'moveToRoot')
					) {
						data = { success: true };
					} else if (resource === 'file' && operation === 'getManyFiles') {
						let cloudItems: any[] = [];
						if (Array.isArray(responseData)) cloudItems = responseData;
						else if (responseData && Array.isArray(responseData.data)) cloudItems = responseData.data;
						else if (
							responseData &&
							responseData.data &&
							Array.isArray(responseData.data.cloudItems)
						)
							cloudItems = responseData.data.cloudItems;
						else if (responseData && Array.isArray(responseData.cloudItems))
							cloudItems = responseData.cloudItems;

						returnData.push(
							...cloudItems
								.filter((entry: any) => entry.type === 'file')
								.map((entry: any) => ({
									json: {
										id: entry.id,
										name: entry.name,
										type: entry.type,
										folderId: entry.folderId,
										parentCloudItemId: entry.parentCloudItemId,
										size: entry.size,
										file: entry.file,
										createdAt: entry.createdAt,
										updatedAt: entry.updatedAt,
										authorEntity: entry.authorEntity,
									},
								})),
						);
						continue;
					} else if (resource === 'item' && operation === 'get') {
						if (responseData && responseData.data && responseData.data.databaseItem) {
							const itemRaw = responseData.data.databaseItem;
							data = {
								itemId: itemRaw.id,
								name: itemRaw.name,
								createdAt: itemRaw.createdAt,
								updatedAt: itemRaw.updatedAt,
								cellValues: itemRaw.cellValues,
							};
						}
					} else if (resource === 'item' && (operation === 'create' || operation === 'update')) {
						if (responseData && responseData.data && responseData.data.databaseItem) {
							const itemRaw = responseData.data.databaseItem;
							data = {
								itemId: itemRaw.id,
								name: itemRaw.name,
								createdAt: itemRaw.createdAt,
								updatedAt: itemRaw.updatedAt,
							};
						}
					} else if (
						resource === 'item' &&
						(operation === 'getMany' || operation === 'findItems')
					) {
						if (responseData && responseData.data && Array.isArray(responseData.data.databaseItemsGroups)) {
							const items = responseData.data.databaseItemsGroups.flat();
							if (items.length === 0) {
								returnData.push({ json: { found: false, count: 0, items: [] } });
							} else {
								returnData.push(...items.map((itemRaw: any) => ({
									json: {
										found: true,
										itemId: itemRaw.id,
										name: itemRaw.name,
										createdAt: itemRaw.createdAt,
										updatedAt: itemRaw.updatedAt,
										cellValues: itemRaw.cellValues,
									}
								})));
							}
							continue;
						}
					} else if (resource === 'item' && operation === 'delete') {
						data = { success: true };
					} else if (resource === 'property' && operation === 'getMany') {
						if (responseData && responseData.data && Array.isArray(responseData.data.properties)) {
							const properties = responseData.data.properties;
							returnData.push(...properties.map((prop: any) => ({
								json: {
									id: prop.id,
									title: prop.title,
									type: prop.type,
									databaseId: prop.databaseId,
									valueType: prop.valueType,
									options: prop.options,
									position: prop.position,
								}
							})));
							continue;
						}
					} else if (resource === 'workspace' && operation === 'getAllWorkspaces') {
						if (responseData && responseData.data && Array.isArray(responseData.data.workspaces)) {
							const workspaces = responseData.data.workspaces;
							returnData.push(...workspaces.map((ws: any) => ({
								json: {
									id: ws.id,
									title: ws.title,
									name: ws.name,
								}
							})));
							continue;
						}
					} else if (resource === 'workspace' && operation === 'getResources') {
						if (responseData && responseData.data && Array.isArray(responseData.data.resourceItems)) {
							const items = responseData.data.resourceItems;
							returnData.push(...items.map((item: any) => ({
								json: {
									resourceId: item.resourceEntity?.resourceId || item.id,
									name: item.name,
									type: item.resourceEntity?.resourceType || item.iconNameType,
									workspaceId: item.workspaceId,
									createdAt: item.resourceEntity?.payload?.createdAt || null,
								}
							})));
							continue;
						}
					} else if (resource === 'workspace' && operation === 'createWorkspace') {
						if (responseData && responseData.data && responseData.data.workspace) {
							const wsRaw = responseData.data.workspace;
							data = {
								id: wsRaw.id,
								title: wsRaw.title,
								name: wsRaw.name,
							};
						}
					} else if (resource === 'database' && (operation === 'create' || operation === 'update')) {
						if (responseData && responseData.data && responseData.data.database) {
							const dbRaw = responseData.data.database;
							data = {
								databaseId: dbRaw.id,
								title: dbRaw.title,
								createdAt: dbRaw.createdAt,
							};
						}
					} else if (resource === 'property' && operation === 'update') {
						if (responseData && responseData.data && responseData.data.property) {
							const prop = responseData.data.property;
							data = {
								id: prop.id,
								title: prop.title,
								type: prop.type,
								databaseId: prop.databaseId,
								valueType: prop.valueType,
								options: prop.options,
								position: prop.position,
							};
						}
					} else if (resource === 'view' && operation === 'update') {
						if (responseData && responseData.data && responseData.data.databaseView) {
							const viewRaw = responseData.data.databaseView;
							data = {
								viewId: viewRaw.id,
								name: viewRaw.name,
								type: viewRaw.type,
								createdAt: viewRaw.createdAt,
							};
						}
					}
					returnData.push({ json: data });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as any).message } });
					continue;
				}
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}
