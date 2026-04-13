---
name: Bulk Operations in n8n Nodes
description: Best practices for implementing bulk Create/Delete operations in custom n8n nodes instead of single item operations.
---

# Bulk Operations in n8n Nodes

Kiedy projektujesz custom node'a w n8n, bardzo często operacje potrafią ograniczać użytkownika do przetwarzania po jednym zasobie naraz (np. stworzenia 1 kolumny lub usunięcia 1 rekordu). Dobrą praktyką (skill'em) jest ułatwianie użytkownikowi masowych operacji w obrębie 1 klocka. Poniżej znajduje się wzorzec w jaki powinieneś to wdrożyć.

## 1. Grupowe Dodawanie (Bulk Create z użyciem `fixedCollection`)
Zamiast tworzyć izolowane pola wejściowe (np. `name`, `type`), użyj opcji w n8n o nazwie `fixedCollection` z atrybutem `multipleValues: true`. 

**Konfiguracja UI:**
```typescript
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
				},
				{
					displayName: 'Property Type',
					name: 'type',
					type: 'options',
					options: [ ... ],
					default: 'text',
					required: true,
				},
			],
		},
	],
}
```

**Logika API (Execute):**
```typescript
const propertiesList = this.getNodeParameter('propertiesList', itemIndex, { propertyValues: [] }) as any;
const createdProps = [];

for (const prop of propertiesList.propertyValues || []) {
	const body = { title: prop.title, type: prop.type };
	const res = await this.helpers.requestWithAuthentication.call(this, 'credentialsApiName', { method: 'POST', url: `...`, body, json: true });
	createdProps.push(res);
}

returnData.push({ json: { createdProperties: createdProps } });
continue; // kontynuuj pętle n8n
```

## 2. Grupowe Usuwanie (Bulk Delete z podziałem stringa)
Gdy API uderza po ID zasobu, zamiast blokować użytkownika jednym ID typu drop-down (`multiOptions`), użyj po prostu pola typu `string` i poproś o ID oddzielone przecinkiem. Umożliwia to zmapowanie masowo tablicy do usunięcia.

**Konfiguracja UI:**
```typescript
{
	displayName: 'Property IDs to Delete',
	name: 'propertyIdsToDelete',
	type: 'string',
	default: '',
	required: true,
	displayOptions: {
		show: {
			resource: ['property'],
			operation: ['delete'],
		},
	},
	description: 'Comma separated list of Property IDs to delete',
}
```

**Logika API (Execute):**
```typescript
const propertyIdsStr = this.getNodeParameter('propertyIdsToDelete', itemIndex) as string;
const propertyIds = propertyIdsStr.split(',').map(id => id.trim()).filter(id => id);

const deletedProps = [];
for (const propId of propertyIds) {
	const res = await this.helpers.requestWithAuthentication.call(this, 'credentialsApiName', { method: 'DELETE', url: `.../${propId}`, json: true });
	deletedProps.push({ propertyId: propId, status: res });
}

returnData.push({ json: { deletedProperties: deletedProps } });
continue;
```

**Podsumowanie:**
Dzięki takiemu rozpisaniu parametrów dajesz użytkownikowi "Smart Node", odciążając go z budowy niepotrzebnych pętli logicznych poza węzłem w interfejsie przepływów n8n.
