import { MEMORY_PROVIDER } from '../core/config.js';
import { logger } from '../core/logger.js';
import {
  AgentMemoryRootService,
  SessionArchiveCause,
} from './agent-memory-root.js';
import { ChunkInsert, MemoryStore } from './memory-store.js';
import { MemoryItem, MemoryProcedure } from './memory-types.js';

export type MemoryProvider = Pick<
  MemoryStore,
  | 'close'
  | 'saveItem'
  | 'findItemByKey'
  | 'getItemById'
  | 'patchItem'
  | 'pinItem'
  | 'saveItemEmbedding'
  | 'getCachedEmbedding'
  | 'putCachedEmbedding'
  | 'findSimilarItems'
  | 'listActiveItems'
  | 'softDeleteItem'
  | 'incrementRetrievalCount'
  | 'recordRetrievalSignal'
  | 'bumpConfidence'
  | 'adjustConfidence'
  | 'decayUnusedConfidence'
  | 'countReflectionsSinceLastUsageDecay'
  | 'recordUsageDecayRun'
  | 'listTopItems'
  | 'chunkExists'
  | 'touchItem'
  | 'saveProcedure'
  | 'getProcedureById'
  | 'patchProcedure'
  | 'listTopProcedures'
  | 'saveChunks'
  | 'lexicalSearch'
  | 'vectorSearch'
  | 'searchProceduresByText'
  | 'listSourceChunks'
  | 'applyRetentionPolicies'
  | 'recordEvent'
> & {
  providerName?: string;
};

type MemoryProviderFactory = () => MemoryProvider;

const memoryProviderFactories = new Map<string, MemoryProviderFactory>();

function createSqliteProvider(): MemoryProvider {
  const store = new MemoryStore();
  return Object.assign(store, { providerName: 'sqlite' as const });
}

function mirrorMemoryItem(
  memoryRoot: AgentMemoryRootService,
  item: MemoryItem,
  action: 'saved' | 'patched',
): void {
  try {
    const filePath = memoryRoot.writeMemoryItem(item);
    memoryRoot.appendJournalEntry({
      title: `memory-${action}`,
      lines: [
        `id: ${item.id}`,
        `scope: ${item.scope}`,
        `group: ${item.group_folder}`,
        `key: ${item.key}`,
        `kind: ${item.kind}`,
        `source: ${item.source}`,
        `profile_path: ${filePath}`,
      ],
    });
  } catch (err) {
    logger.warn(
      { err, memoryId: item.id },
      'Failed to mirror memory item to AGENT_MEMORY_ROOT markdown',
    );
  }
}

function mirrorProcedure(
  memoryRoot: AgentMemoryRootService,
  procedure: MemoryProcedure,
  action: 'saved' | 'patched',
): void {
  try {
    const filePath = memoryRoot.writeProcedure(procedure);
    memoryRoot.appendJournalEntry({
      title: `procedure-${action}`,
      lines: [
        `id: ${procedure.id}`,
        `scope: ${procedure.scope}`,
        `group: ${procedure.group_folder}`,
        `title: ${procedure.title}`,
        `source: ${procedure.source}`,
        `procedures_path: ${filePath}`,
      ],
    });
  } catch (err) {
    logger.warn(
      { err, procedureId: procedure.id },
      'Failed to mirror procedure to AGENT_MEMORY_ROOT markdown',
    );
  }
}

function toJournalCause(eventType: string): SessionArchiveCause | null {
  if (eventType === 'compact_manual') return 'manual-compact';
  if (eventType === 'compact_auto') return 'auto-compact';
  if (eventType === 'stale_session') return 'stale-session';
  if (eventType === 'abandoned_session') return 'abandoned-session';
  return null;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable payload]';
  }
}

function createQmdProvider(): MemoryProvider {
  const memoryRoot = AgentMemoryRootService.getInstance();
  const sqlitePath = memoryRoot.getSqliteCachePath();
  const store = new MemoryStore(sqlitePath);

  logger.info(
    {
      sqlitePath,
      memoryRoot: memoryRoot.getLayout().root,
    },
    'Using QMD memory provider backed by AGENT_MEMORY_ROOT',
  );

  return {
    providerName: 'qmd',
    close: () => store.close(),
    saveItem: (...args: Parameters<MemoryStore['saveItem']>) => {
      const item = store.saveItem(...args);
      mirrorMemoryItem(memoryRoot, item, 'saved');
      return item;
    },
    getItemById: (...args: Parameters<MemoryStore['getItemById']>) =>
      store.getItemById(...args),
    findItemByKey: (...args: Parameters<MemoryStore['findItemByKey']>) =>
      store.findItemByKey(...args),
    patchItem: (...args: Parameters<MemoryStore['patchItem']>) => {
      const item = store.patchItem(...args);
      mirrorMemoryItem(memoryRoot, item, 'patched');
      return item;
    },
    pinItem: (...args: Parameters<MemoryStore['pinItem']>) =>
      store.pinItem(...args),
    saveItemEmbedding: (
      ...args: Parameters<MemoryStore['saveItemEmbedding']>
    ) => store.saveItemEmbedding(...args),
    getCachedEmbedding: (
      ...args: Parameters<MemoryStore['getCachedEmbedding']>
    ) => store.getCachedEmbedding(...args),
    putCachedEmbedding: (
      ...args: Parameters<MemoryStore['putCachedEmbedding']>
    ) => store.putCachedEmbedding(...args),
    findSimilarItems: (...args: Parameters<MemoryStore['findSimilarItems']>) =>
      store.findSimilarItems(...args),
    listActiveItems: (...args: Parameters<MemoryStore['listActiveItems']>) =>
      store.listActiveItems(...args),
    softDeleteItem: (...args: Parameters<MemoryStore['softDeleteItem']>) =>
      store.softDeleteItem(...args),
    incrementRetrievalCount: (
      ...args: Parameters<MemoryStore['incrementRetrievalCount']>
    ) => store.incrementRetrievalCount(...args),
    recordRetrievalSignal: (
      ...args: Parameters<MemoryStore['recordRetrievalSignal']>
    ) => store.recordRetrievalSignal(...args),
    bumpConfidence: (...args: Parameters<MemoryStore['bumpConfidence']>) =>
      store.bumpConfidence(...args),
    adjustConfidence: (...args: Parameters<MemoryStore['adjustConfidence']>) =>
      store.adjustConfidence(...args),
    decayUnusedConfidence: (
      ...args: Parameters<MemoryStore['decayUnusedConfidence']>
    ) => store.decayUnusedConfidence(...args),
    countReflectionsSinceLastUsageDecay: (
      ...args: Parameters<MemoryStore['countReflectionsSinceLastUsageDecay']>
    ) => store.countReflectionsSinceLastUsageDecay(...args),
    recordUsageDecayRun: (
      ...args: Parameters<MemoryStore['recordUsageDecayRun']>
    ) => store.recordUsageDecayRun(...args),
    listTopItems: (...args: Parameters<MemoryStore['listTopItems']>) =>
      store.listTopItems(...args),
    chunkExists: (...args: Parameters<MemoryStore['chunkExists']>) =>
      store.chunkExists(...args),
    touchItem: (...args: Parameters<MemoryStore['touchItem']>) =>
      store.touchItem(...args),
    saveProcedure: (...args: Parameters<MemoryStore['saveProcedure']>) => {
      const procedure = store.saveProcedure(...args);
      mirrorProcedure(memoryRoot, procedure, 'saved');
      return procedure;
    },
    getProcedureById: (...args: Parameters<MemoryStore['getProcedureById']>) =>
      store.getProcedureById(...args),
    patchProcedure: (...args: Parameters<MemoryStore['patchProcedure']>) => {
      const procedure = store.patchProcedure(...args);
      mirrorProcedure(memoryRoot, procedure, 'patched');
      return procedure;
    },
    listTopProcedures: (
      ...args: Parameters<MemoryStore['listTopProcedures']>
    ) => store.listTopProcedures(...args),
    saveChunks: (...args: Parameters<MemoryStore['saveChunks']>) =>
      store.saveChunks(...args),
    lexicalSearch: (...args: Parameters<MemoryStore['lexicalSearch']>) =>
      store.lexicalSearch(...args),
    vectorSearch: (...args: Parameters<MemoryStore['vectorSearch']>) =>
      store.vectorSearch(...args),
    searchProceduresByText: (
      ...args: Parameters<MemoryStore['searchProceduresByText']>
    ) => store.searchProceduresByText(...args),
    listSourceChunks: (...args: Parameters<MemoryStore['listSourceChunks']>) =>
      store.listSourceChunks(...args),
    applyRetentionPolicies: (
      ...args: Parameters<MemoryStore['applyRetentionPolicies']>
    ) => store.applyRetentionPolicies(...args),
    recordEvent: (...args: Parameters<MemoryStore['recordEvent']>) => {
      store.recordEvent(...args);
      const [eventType, entityType, entityId, payload] = args;
      const cause = toJournalCause(eventType);
      memoryRoot.appendJournalEntry({
        title: cause ? `lifecycle-${cause}` : `event-${eventType}`,
        lines: [
          `entity_type: ${entityType}`,
          `entity_id: ${entityId || ''}`,
          `payload: ${safeJson(payload)}`,
        ],
      });
    },
  };
}

export function registerMemoryProvider(
  name: string,
  factory: MemoryProviderFactory,
): void {
  memoryProviderFactories.set(name, factory);
}

function resolveConfiguredMemoryProvider(): string {
  const runtimeValue = process.env.MEMORY_PROVIDER?.trim();
  if (runtimeValue) return runtimeValue;
  return MEMORY_PROVIDER;
}

export function createMemoryProvider(
  providerName = resolveConfiguredMemoryProvider(),
): MemoryProvider {
  const factory = memoryProviderFactories.get(providerName);
  if (!factory) {
    throw new Error(
      `Unknown memory provider "${providerName}". Registered providers: ${[...memoryProviderFactories.keys()].join(', ') || 'none'}`,
    );
  }
  return factory();
}

registerMemoryProvider('sqlite', createSqliteProvider);
registerMemoryProvider('qmd', createQmdProvider);

export type { ChunkInsert };
