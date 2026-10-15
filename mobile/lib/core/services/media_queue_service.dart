import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:hive/hive.dart';
import '../di/injection.dart';
import '../api/mobile_api_client.dart';
import '../api/sync_engine.dart';

class MediaQueueItem {
  final String id;
  final String localFilePath;
  final String mediaType; // 'homework' | 'receipt' | 'exam' | 'avatar'
  final String entityId;
  final String timestamp;
  final int fileSize;
  int retryCount;
  String? lastError;
  bool isUploaded;
  String? remoteUrl;

  MediaQueueItem({
    required this.id,
    required this.localFilePath,
    required this.mediaType,
    required this.entityId,
    required this.timestamp,
    required this.fileSize,
    this.retryCount = 0,
    this.lastError,
    this.isUploaded = false,
    this.remoteUrl,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'localFilePath': localFilePath,
      'mediaType': mediaType,
      'entityId': entityId,
      'timestamp': timestamp,
      'fileSize': fileSize,
      'retryCount': retryCount,
      'lastError': lastError,
      'isUploaded': isUploaded,
      'remoteUrl': remoteUrl,
    };
  }

  factory MediaQueueItem.fromMap(Map<dynamic, dynamic> map) {
    return MediaQueueItem(
      id: map['id'] as String,
      localFilePath: map['localFilePath'] as String,
      mediaType: map['mediaType'] as String? ?? 'general',
      entityId: map['entityId']?.toString() ?? '',
      timestamp: map['timestamp'] as String,
      fileSize: (map['fileSize'] as num?)?.toInt() ?? 0,
      retryCount: (map['retryCount'] as num?)?.toInt() ?? 0,
      lastError: map['lastError'] as String?,
      isUploaded: map['isUploaded'] as bool? ?? false,
      remoteUrl: map['remoteUrl'] as String?,
    );
  }
}

class MediaQueueService {
  static const String boxMediaQueue = 'offline_media_queue';
  final ValueNotifier<int> pendingMediaCountNotifier = ValueNotifier<int>(0);
  bool _isUploading = false;

  Future<void> init() async {
    try {
      if (!Hive.isBoxOpen(boxMediaQueue)) {
        await Hive.openBox(boxMediaQueue);
      }
      _updateCount();
      debugPrint("📸 MediaQueueService initialized successfully.");
    } catch (e) {
      debugPrint("❌ MediaQueueService init error: $e");
    }
  }

  void _updateCount() {
    if (Hive.isBoxOpen(boxMediaQueue)) {
      final box = Hive.box(boxMediaQueue);
      pendingMediaCountNotifier.value = box.length;
    }
  }

  /// Store captured image into phone documents directory to keep Hive lightweight
  Future<MediaQueueItem?> saveAndEnqueueMedia({
    required File rawFile,
    required String mediaType,
    required String entityId,
  }) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final mediaFolder = Directory('${appDir.path}/edut_offline_media');
      if (!await mediaFolder.exists()) {
        await mediaFolder.create(recursive: true);
      }

      final ext = rawFile.path.split('.').last;
      final fileName = 'media_${mediaType}_${entityId}_${DateTime.now().millisecondsSinceEpoch}.$ext';
      final savedPath = '${mediaFolder.path}/$fileName';

      // Copy file to permanent offline media folder
      final savedFile = await rawFile.copy(savedPath);
      final fileSize = await savedFile.length();

      final queueId = 'media_${DateTime.now().millisecondsSinceEpoch}';
      final item = MediaQueueItem(
        id: queueId,
        localFilePath: savedPath,
        mediaType: mediaType,
        entityId: entityId,
        timestamp: DateTime.now().toIso8601String(),
        fileSize: fileSize,
      );

      final box = Hive.box(boxMediaQueue);
      await box.put(queueId, item.toMap());
      _updateCount();

      debugPrint("📸 Enqueued offline media: $queueId (Path: $savedPath, Size: ${fileSize ~/ 1024} KB)");
      return item;
    } catch (e) {
      debugPrint("❌ Error enqueueing offline media: $e");
      return null;
    }
  }

  /// Process pending media upload queue when internet is available
  Future<void> processQueue() async {
    if (_isUploading) return;
    if (!Hive.isBoxOpen(boxMediaQueue)) return;

    final syncEngine = locator.isRegistered<SyncEngine>() ? locator<SyncEngine>() : null;
    if (syncEngine != null && !syncEngine.isOnlineNotifier.value) return;

    _isUploading = true;
    try {
      final box = Hive.box(boxMediaQueue);
      final List<String> keys = List<String>.from(box.keys);

      for (final key in keys) {
        final val = box.get(key);
        if (val is! Map) continue;

        final item = MediaQueueItem.fromMap(val);
        final file = File(item.localFilePath);

        if (!await file.exists()) {
          // File was deleted or moved, remove from queue
          await box.delete(key);
          continue;
        }

        final uploaded = await _uploadSingleMedia(item, file);
        if (uploaded) {
          await box.delete(key);
          debugPrint("✅ Uploaded and dequeued media: ${item.id}");
        } else {
          item.retryCount += 1;
          await box.put(key, item.toMap());
        }
      }
    } finally {
      _isUploading = false;
      _updateCount();
    }
  }

  Future<bool> _uploadSingleMedia(MediaQueueItem item, File file) async {
    try {
      final client = locator.isRegistered<MobileApiClient>()
          ? locator<MobileApiClient>()
          : MobileApiClient();

      // Post media file via mobile client
      final response = await client.postJson('/api/mobile/media/upload', {
        'queueId': item.id,
        'mediaType': item.mediaType,
        'entityId': item.entityId,
        'fileName': file.path.split(Platform.pathSeparator).last,
      });

      return response['success'] == true;
    } catch (e) {
      debugPrint("⚠️ Failed to upload media ${item.id}: $e");
      return false;
    }
  }
}
