import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

/**
 * Utility to compress voice command items into a compact Base64/URI encoded payload.
 */
export const compressVoiceCommandsData = (commands: any[]): string => {
  try {
    const jsonString = JSON.stringify(commands);
    // Encode unicode characters safely into Base64 payload
    return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (error) {
    console.error('[VoiceCompressor] Error compressing voice commands:', error);
    return JSON.stringify(commands);
  }
};

/**
 * Utility to decompress a compressed voice command payload back into an array.
 */
export const decompressVoiceCommandsData = (compressedString: string): any[] => {
  try {
    const jsonString = decodeURIComponent(Array.prototype.map.call(atob(compressedString), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[VoiceCompressor] Error decompressing payload:', error);
    try {
      return JSON.parse(compressedString);
    } catch {
      return [];
    }
  }
};

export interface CompressionResult {
  compressed: boolean;
  totalBefore: number;
  retainedUncompressed: number;
  compressedCount: number;
  archiveId?: string;
  error?: string;
}

/**
 * Background Service function that automatically checks Firestore for omnichat_voice_commands
 * and compresses older entries if total count exceeds threshold (default 500).
 */
export const checkAndCompressVoiceCommands = async (
  userId?: string, 
  threshold: number = 500,
  retainCount: number = 100
): Promise<CompressionResult> => {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) {
    return { compressed: false, totalBefore: 0, retainedUncompressed: 0, compressedCount: 0 };
  }

  const path = `users/${uid}/voice_commands`;

  try {
    const voiceCmdRef = collection(db, 'users', uid, 'voice_commands');
    const snapshot = await getDocs(voiceCmdRef);
    const totalCount = snapshot.docs.length;

    if (totalCount <= threshold) {
      return {
        compressed: false,
        totalBefore: totalCount,
        retainedUncompressed: totalCount,
        compressedCount: 0
      };
    }

    console.info(`[Voice Commands Auto-Compressor] Threshold reached (${totalCount} > ${threshold} entries). Initiating background compression...`);

    // Parse all doc data and keep track of refs
    const allDocs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ref: docSnap.ref,
        data: data,
        timestamp: data.updatedAt || data.timestamp || 0
      };
    });

    // Sort descending (newest first)
    allDocs.sort((a, b) => b.timestamp - a.timestamp);

    // Retain top `retainCount` newest entries uncompressed
    const recentDocs = allDocs.slice(0, retainCount);
    const olderDocs = allDocs.slice(retainCount);

    if (olderDocs.length === 0) {
      return {
        compressed: false,
        totalBefore: totalCount,
        retainedUncompressed: totalCount,
        compressedCount: 0
      };
    }

    // Prepare data payloads for compression
    const itemsToCompress = olderDocs.map(item => item.data);
    const compressedPayload = compressVoiceCommandsData(itemsToCompress);

    const archiveId = `archive_vc_${Date.now()}`;
    const archiveRef = doc(db, 'users', uid, 'compressed_voice_commands', archiveId);

    const timestamps = itemsToCompress.map(item => item.updatedAt || item.timestamp || 0).filter(Boolean);
    const startDate = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const endDate = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

    const archivePayload = {
      userId: uid,
      id: archiveId,
      count: itemsToCompress.length,
      compressedData: compressedPayload,
      originalStartDate: startDate,
      originalEndDate: endDate,
      compressedAt: Date.now()
    };

    // Firestore WriteBatch has a maximum limit of 500 operations.
    // Batch operations: 1 setDoc for archive + N deleteDocs for older items.
    const batchSizeLimit = 450; 
    let currentBatch = writeBatch(db);
    let opCount = 0;

    // Save compressed archive first
    currentBatch.set(archiveRef, archivePayload);
    opCount++;

    for (const item of olderDocs) {
      currentBatch.delete(item.ref);
      opCount++;

      if (opCount >= batchSizeLimit) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await currentBatch.commit();
    }

    console.info(
      `[Voice Commands Auto-Compressor] Successfully compressed ${olderDocs.length} voice command entries into Firebase archive document (${archiveId}). Retained ${recentDocs.length} active entries.`
    );

    return {
      compressed: true,
      totalBefore: totalCount,
      retainedUncompressed: recentDocs.length,
      compressedCount: olderDocs.length,
      archiveId
    };
  } catch (error: any) {
    console.error('[Voice Commands Auto-Compressor] Failed during automatic compression:', error);
    return {
      compressed: false,
      totalBefore: 0,
      retainedUncompressed: 0,
      compressedCount: 0,
      error: error?.message || String(error)
    };
  }
};

let serviceIntervalId: NodeJS.Timeout | null = null;

/**
 * Starts the automatic background compression service loop.
 * Checks Firebase every 30 seconds when an authenticated user is active.
 */
export const startVoiceCommandCompressorService = (checkIntervalMs: number = 30000) => {
  if (serviceIntervalId) {
    clearInterval(serviceIntervalId);
  }

  const runCheck = () => {
    if (auth.currentUser) {
      checkAndCompressVoiceCommands(auth.currentUser.uid, 500).catch(err => {
        console.error('[VoiceCommandsCompressorService] Check failed:', err);
      });
    }
  };

  // Run initial check after slight delay
  setTimeout(runCheck, 3000);

  // Set periodic background task
  serviceIntervalId = setInterval(runCheck, checkIntervalMs);

  return () => {
    if (serviceIntervalId) {
      clearInterval(serviceIntervalId);
      serviceIntervalId = null;
    }
  };
};
