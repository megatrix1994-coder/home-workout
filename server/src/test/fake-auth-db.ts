type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;

export const tables = {
  users: [] as Row[],
  sessions: [] as Row[],
  tokens: [] as Row[],
  workouts: [] as Row[],
};

export function resetFakeDb() {
  tables.users.length = 0;
  tables.sessions.length = 0;
  tables.tokens.length = 0;
  tables.workouts.length = 0;
}

function matches(row: Row, where: Where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key] ?? null;
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      const test = condition as { not?: unknown; gt?: Date; in?: unknown[] };
      if ('not' in test) return value !== (test.not ?? null);
      if ('gt' in test) return value instanceof Date && test.gt !== undefined && value > test.gt;
      if ('in' in test) return test.in?.includes(value) ?? false;
    }
    return value === (condition ?? null);
  });
}

function withUserIncludes(user: Row) {
  const sessions = tables.sessions
    .filter((session) => session.userId === user.id)
    .sort((left, right) => (right.lastSeenAt as Date).getTime() - (left.lastSeenAt as Date).getTime())
    .slice(0, 1)
    .map((session) => ({ lastSeenAt: session.lastSeenAt }));
  return {
    ...user,
    sessions,
    _count: { workouts: tables.workouts.filter((workout) => workout.userId === user.id).length },
  };
}

function userById(id: unknown) {
  return tables.users.find((user) => user.id === id) ?? null;
}

const user = {
  findUnique: async ({ where, include }: { where: Where; include?: unknown }) => {
    const found = tables.users.find((row) => matches(row, where)) ?? null;
    return found && include ? withUserIncludes(found) : found;
  },
  findMany: async () => tables.users.map((row) => withUserIncludes(row)),
  count: async ({ where }: { where: Where }) => tables.users.filter((row) => matches(row, where)).length,
  create: async ({ data }: { data: Row }) => {
    if (tables.users.some((row) => row.email === data.email)) {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    }
    const now = new Date();
    const row: Row = {
      role: 'member',
      status: 'active',
      removedAt: null,
      createdAt: now,
      updatedAt: now,
      ...data,
      id: nextId('user'),
    };
    tables.users.push(row);
    return row;
  },
  update: async ({ where, data }: { where: Where; data: Row }) => {
    const row = tables.users.find((item) => matches(item, where));
    if (!row) throw new Error('User not found');
    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },
  delete: async ({ where }: { where: Where }) => {
    const index = tables.users.findIndex((item) => matches(item, where));
    const [row] = tables.users.splice(index, 1);
    for (const table of [tables.sessions, tables.workouts]) {
      for (let i = table.length - 1; i >= 0; i -= 1) {
        if (table[i]!.userId === row!.id) table.splice(i, 1);
      }
    }
    return row;
  },
};

const session = {
  create: async ({ data }: { data: Row }) => {
    const row: Row = { lastSeenAt: new Date(), createdAt: new Date(), ...data, id: nextId('session') };
    tables.sessions.push(row);
    return row;
  },
  findUnique: async ({ where }: { where: Where }) => {
    const row = tables.sessions.find((item) => matches(item, where));
    if (!row) return null;
    return { ...row, user: userById(row.userId) };
  },
  update: async ({ where, data }: { where: Where; data: Row }) => {
    const row = tables.sessions.find((item) => matches(item, where));
    if (row) Object.assign(row, data);
    return row;
  },
  deleteMany: async ({ where }: { where: Where }) => {
    const before = tables.sessions.length;
    for (let i = tables.sessions.length - 1; i >= 0; i -= 1) {
      if (matches(tables.sessions[i]!, where)) tables.sessions.splice(i, 1);
    }
    return { count: before - tables.sessions.length };
  },
};

const accessToken = {
  create: async ({ data }: { data: Row }) => {
    const row: Row = {
      email: null,
      userId: null,
      usedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      ...data,
      id: nextId('token'),
    };
    tables.tokens.push(row);
    return row;
  },
  findUnique: async ({ where }: { where: Where }) => {
    const row = tables.tokens.find((item) => matches(item, where));
    return row ? { ...row, user: userById(row.userId) } : null;
  },
  findMany: async ({ where }: { where: Where }) =>
    tables.tokens
      .filter((row) => matches(row, where))
      .map((row) => ({ ...row, createdBy: userById(row.createdById) })),
  update: async ({ where, data }: { where: Where; data: Row }) => {
    const row = tables.tokens.find((item) => matches(item, where));
    if (row) Object.assign(row, data);
    return row;
  },
  updateMany: async ({ where, data }: { where: Where; data: Row }) => {
    const rows = tables.tokens.filter((item) => matches(item, where));
    for (const row of rows) Object.assign(row, data);
    return { count: rows.length };
  },
};

export const fakeDb = {
  user,
  session,
  accessToken,
  async $transaction(input: unknown) {
    if (typeof input === 'function') {
      return (input as (tx: unknown) => Promise<unknown>)(fakeDb);
    }
    return Promise.all(input as Promise<unknown>[]);
  },
};
