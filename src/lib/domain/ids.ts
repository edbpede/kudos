export type IdGenerator = () => string;

export const createId: IdGenerator = () => {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	const random = Math.random().toString(36).slice(2, 10);
	return `${Date.now().toString(36)}-${random}`;
};

export const createPrefixedId = (
	prefix: string,
	idGenerator: IdGenerator = createId,
) => `${prefix}_${idGenerator()}`;
