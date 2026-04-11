import fs from 'fs';
import path from 'path';

import { logger } from '../core/logger.js';
import { resolveGroupIpcPath } from '../platform/group-folder.js';
import { MemoryService } from './memory-service.js';
import { MemoryIpcRequest, MemoryIpcResponse } from './memory-ipc-contract.js';
import {
  PatchMemoryInput,
  PatchProcedureInput,
  SaveMemoryInput,
  SaveProcedureInput,
} from './memory-types.js';

export async function processMemoryRequest(
  request: MemoryIpcRequest,
  sourceGroup: string,
  isMain: boolean,
): Promise<MemoryIpcResponse> {
  let provider = 'uninitialized';

  try {
    const memory = MemoryService.getInstance();
    provider = memory.getProviderName();
    logger.debug(
      { action: request.action, sourceGroup, isMain, provider },
      'Processing memory IPC request',
    );

    switch (request.action) {
      case 'memory_search': {
        const query = String(request.payload.query || '').trim();
        if (!query) {
          throw new Error('query is required');
        }
        const requestedGroupFolder = request.payload.group_folder
          ? String(request.payload.group_folder)
          : undefined;
        const groupFolder =
          isMain && requestedGroupFolder ? requestedGroupFolder : sourceGroup;
        const results = await memory.search({
          query,
          groupFolder,
          userId: request.payload.user_id
            ? String(request.payload.user_id)
            : undefined,
          limit: request.payload.limit
            ? Number(request.payload.limit)
            : undefined,
        });
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { results },
        };
      }
      case 'memory_save': {
        const saved = await memory.saveMemory(
          request.payload as unknown as SaveMemoryInput,
          {
            isMain,
            groupFolder: sourceGroup,
          },
        );
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { memory: saved },
        };
      }
      case 'memory_patch': {
        const patched = memory.patchMemory(
          request.payload as unknown as PatchMemoryInput,
          {
            isMain,
            groupFolder: sourceGroup,
          },
        );
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { memory: patched },
        };
      }
      case 'memory_consolidate': {
        const requestedGroupFolder = request.payload.group_folder
          ? String(request.payload.group_folder)
          : undefined;
        const groupFolder =
          isMain && requestedGroupFolder ? requestedGroupFolder : sourceGroup;
        const result = await memory.consolidateGroupMemory(groupFolder);
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { consolidation: result },
        };
      }
      case 'memory_dream': {
        const requestedGroupFolder = request.payload.group_folder
          ? String(request.payload.group_folder)
          : undefined;
        const groupFolder =
          isMain && requestedGroupFolder ? requestedGroupFolder : sourceGroup;
        const result = await memory.runDreamingSweep(groupFolder);
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { dreaming: result },
        };
      }
      case 'procedure_save': {
        const saved = memory.saveProcedure(
          request.payload as unknown as SaveProcedureInput,
          {
            isMain,
            groupFolder: sourceGroup,
          },
        );
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { procedure: saved },
        };
      }
      case 'procedure_patch': {
        const patched = memory.patchProcedure(
          request.payload as unknown as PatchProcedureInput,
          {
            isMain,
            groupFolder: sourceGroup,
          },
        );
        return {
          ok: true,
          requestId: request.requestId,
          provider,
          data: { procedure: patched },
        };
      }
      default:
        throw new Error(
          `Unsupported memory action: ${(request as { action?: string }).action || 'unknown'}`,
        );
    }
  } catch (err) {
    return {
      ok: false,
      requestId: request.requestId,
      provider,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function writeMemoryResponse(
  groupFolder: string,
  requestId: string,
  response: MemoryIpcResponse,
): void {
  const ipcDir = resolveGroupIpcPath(groupFolder);
  const responsesDir = path.join(ipcDir, 'memory-responses');
  fs.mkdirSync(responsesDir, { recursive: true });

  const filePath = path.join(responsesDir, `${requestId}.json`);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(response, null, 2));
  fs.renameSync(tmpPath, filePath);
}

export async function writeMemoryContextSnapshot(
  groupFolder: string,
  isMain: boolean,
  prompt: string,
  userId?: string,
): Promise<{ retrievedItemIds: string[] }> {
  const memory = MemoryService.getInstance();
  await memory.ingestGroupSources(groupFolder);
  await memory.ingestGlobalKnowledge();
  const context = await memory.buildMemoryContext(
    prompt,
    groupFolder,
    isMain,
    userId,
  );

  const ipcDir = resolveGroupIpcPath(groupFolder);
  const filePath = path.join(ipcDir, 'memory_context.json');
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        block: context.block,
        generatedAt: new Date().toISOString(),
        facts: context.facts,
        procedures: context.procedures,
        snippets: context.snippets,
        recentWork: context.recentWork,
        retrievedItemIds: context.retrievedItemIds,
      },
      null,
      2,
    ),
  );
  return { retrievedItemIds: context.retrievedItemIds };
}
