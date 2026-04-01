export const randomUUIDv7 = () => crypto.randomUUID();

export const password = {
    hash: async (value: string) => value,
    verify: async ({ password: plain, hash }: { password: string; hash: string }) =>
        plain === hash,
};
