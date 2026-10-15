import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:hive/hive.dart';
import '../di/injection.dart';
import 'offline_queue_manager.dart';
import 'offline_store_manager.dart';
import 'supabase_client.dart';
import 'mobile_api_client.dart';
import '../auth/session_manager.dart';
import '../../features/attendance/data/attendance_repository.dart';
import '../../features/academics/data/academics_repository.dart';
import '../../features/finance/data/finance_repository.dart';
import '../../features/students/data/students_repository.dart';
import '../../features/dashboard/data/dashboard_stats_repository.dart';
import '../../features/pedagogie/data/pedagogie_repository.dart';
import '../../features/canteen/data/canteen_repository.dart';
import '../../features/transport/data/transport_repository.dart';
import '../services/media_queue_service.dart';

class SyncEngine {
  final SupabaseClient _client;
  final OfflineQueueManager _queueManager;
  final Connectivity _connectivity = Connectivity();
  
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  
  final ValueNotifier<bool> isOnlineNotifier = ValueNotifier<bool>(true);
  final ValueNotifier<bool> isSyncingNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<DateTime?> lastSyncNotifier = ValueNotifier<DateTime?>(null);

  SyncEngine({
    SupabaseClient? client,
    OfflineQueueManager? queueManager,
  })  : _client = client ?? SupabaseClientManager().client,
        _queueManager = queueManager ?? locator<OfflineQueueManager>();

  /// Start monitoring connectivity and trigger auto-sync
  void start() {
    _checkInitialConnection();
    _subscription = _connectivity.onConnectivityChanged.listen(_handleConnectionChange);
    
    // Load last sync time
    try {
      if (Hive.isBoxOpen(OfflineQueueManager.boxQueueName)) {
        final box = Hive.box(OfflineQueueManager.boxQueueName);
        final val = box.get('last_sync_time');
        if (val != null) {
          lastSyncNotifier.value = DateTime.tryParse(val.toString());
        }
      }
    } catch (_) {}
  }

  void stop() {
    _subscription?.cancel();
  }

  Future<void> _checkInitialConnection() async {
    final results = await _connectivity.checkConnectivity();
    _updateConnectionStatus(results);
    if (isOnlineNotifier.value) {
      _syncAndHydrateSequentially();
    }
  }

  void _handleConnectionChange(List<ConnectivityResult> results) async {
    final wasOffline = !isOnlineNotifier.value;
    _updateConnectionStatus(results);
    
    // Trigger sync when transitioning from offline to online
    if (isOnlineNotifier.value && wasOffline) {
      debugPrint("🔌 Connection Restored! Refreshing auth session and starting sequential synchronization...");
      _syncAndHydrateSequentially();
    }
  }

  Future<void> _syncAndHydrateSequentially() async {
    try {
      await _ensureFreshAuthToken();
      await triggerSync();

      // Process pending media uploads in the background
      if (locator.isRegistered<MediaQueueService>()) {
        locator<MediaQueueService>().processQueue();
      }

      // First try fast delta sync; if it has never run, run full preload
      final lastSync = lastSyncNotifier.value;
      if (lastSync == null) {
        await preloadAllOfflineData();
      } else {
        await pullDeltaUpdates();
      }
    } catch (e) {
      debugPrint("⚠️ SyncEngine: Sequential sync/hydration error: $e");
    }
  }

  /// Pull delta updates (only modified/deleted records since last sync)
  Future<bool> pullDeltaUpdates() async {
    if (!isOnlineNotifier.value) return false;
    try {
      debugPrint("🔄 SyncEngine: Pulling delta updates from server...");

      final client = locator.isRegistered<MobileApiClient>()
          ? locator<MobileApiClient>()
          : MobileApiClient();

      final sessionManager = locator.isRegistered<SessionManager>()
          ? locator<SessionManager>()
          : null;

      int schoolId = 1;
      if (sessionManager != null) {
        final sIdStr = await sessionManager.getSchoolId();
        schoolId = int.tryParse(sIdStr ?? '') ?? 1;
      }

      final lastSyncIso = lastSyncNotifier.value?.toIso8601String();

      final response = await client.postJson('/api/mobile/sync/delta', {
        'schoolId': schoolId,
        'lastSyncTimestamp': lastSyncIso,
        'entities': ['students', 'attendance', 'grades', 'fee_payments', 'expenses'],
      });

      if (response['success'] != true) {
        debugPrint("⚠️ SyncEngine: Delta sync API responded without success: ${response['error']}");
        return false;
      }

      final changes = response['changes'] as Map<String, dynamic>? ?? {};
      final deletedIds = response['deletedIds'] as Map<String, dynamic>? ?? {};
      final serverTimestamp = response['serverTimestamp'] as String?;

      final storeManager = locator.isRegistered<OfflineStoreManager>()
          ? locator<OfflineStoreManager>()
          : null;

      if (storeManager != null) {
        // 1. Process Students Delta
        if (changes.containsKey('students')) {
          final studentList = List<Map<String, dynamic>>.from(
            (changes['students'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)),
          );
          await storeManager.mergeDeltaList(
            boxName: OfflineStoreManager.boxStudents,
            key: 'students_list',
            updatedItems: studentList,
          );
        }
        if (deletedIds.containsKey('students')) {
          await storeManager.deleteItemsByIds(
            boxName: OfflineStoreManager.boxStudents,
            key: 'students_list',
            deletedIds: List<dynamic>.from(deletedIds['students'] as List? ?? []),
          );
        }

        // 2. Process Fee Payments Delta
        if (changes.containsKey('fee_payments')) {
          final paymentsList = List<Map<String, dynamic>>.from(
            (changes['fee_payments'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)),
          );
          await storeManager.mergeDeltaList(
            boxName: OfflineStoreManager.boxFeePayments,
            key: 'fee_payments_list',
            updatedItems: paymentsList,
          );
        }
        if (deletedIds.containsKey('fee_payments')) {
          await storeManager.deleteItemsByIds(
            boxName: OfflineStoreManager.boxFeePayments,
            key: 'fee_payments_list',
            deletedIds: List<dynamic>.from(deletedIds['fee_payments'] as List? ?? []),
          );
        }

        // 3. Process Grades Delta
        if (changes.containsKey('grades')) {
          final gradesList = List<Map<String, dynamic>>.from(
            (changes['grades'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)),
          );
          await storeManager.mergeDeltaList(
            boxName: OfflineStoreManager.boxStudentResults,
            key: 'student_results_list',
            updatedItems: gradesList,
          );
        }
        if (deletedIds.containsKey('grades')) {
          await storeManager.deleteItemsByIds(
            boxName: OfflineStoreManager.boxStudentResults,
            key: 'student_results_list',
            deletedIds: List<dynamic>.from(deletedIds['grades'] as List? ?? []),
          );
        }

        // 4. Process Expenses Delta
        if (changes.containsKey('expenses')) {
          final serverExpenses = List<Map<String, dynamic>>.from(
            (changes['expenses'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)),
          );

          if (serverExpenses.isNotEmpty) {
            final box = Hive.isBoxOpen(OfflineStoreManager.boxAcademicPeriods)
                ? Hive.box(OfflineStoreManager.boxAcademicPeriods)
                : await Hive.openBox(OfflineStoreManager.boxAcademicPeriods);

            final expKey = "offline_expenses_$schoolId";
            final currentList = List<Map<String, dynamic>>.from(
              (box.get(expKey) as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? []
            );

            // Merge server expenses with local list, deduplicating by ID or reference
            final existingIds = currentList.map((e) => e['id']?.toString()).toSet();
            for (final exp in serverExpenses) {
              final idStr = exp['id']?.toString();
              if (idStr != null && !existingIds.contains(idStr)) {
                currentList.add(exp);
                existingIds.add(idStr);
              }
            }

            await box.put(expKey, currentList);
            debugPrint("📦 SyncEngine: Synced ${serverExpenses.length} expenses into local cache ($expKey).");
          }
        }
      }

      // Update sync timestamp from server or fallback to local
      if (serverTimestamp != null) {
        final parsedDate = DateTime.tryParse(serverTimestamp);
        if (parsedDate != null) {
          lastSyncNotifier.value = parsedDate;
          if (Hive.isBoxOpen(OfflineQueueManager.boxQueueName)) {
            final box = Hive.box(OfflineQueueManager.boxQueueName);
            await box.put('last_sync_time', parsedDate.toIso8601String());
          }
        } else {
          await updateLastSyncTime();
        }
      } else {
        await updateLastSyncTime();
      }

      debugPrint("✅ SyncEngine: Delta Sync completed successfully. Synced at ${lastSyncNotifier.value}");
      return true;
    } catch (e) {
      debugPrint("❌ SyncEngine: Error during pullDeltaUpdates: $e");
      return false;
    }
  }

  /// Preload and hydrate local Hive cache for offline availability (initial full sync)
  Future<void> preloadAllOfflineData() async {
    if (!isOnlineNotifier.value) return;
    try {
      debugPrint("📦 SyncEngine: Hydrating local Hive cache for offline mode...");

      int schoolId = 1;
      int sessionId = 1;
      if (locator.isRegistered<SessionManager>()) {
        final sessionManager = locator<SessionManager>();
        final sIdStr = await sessionManager.getSchoolId();
        schoolId = int.tryParse(sIdStr ?? '') ?? 1;
      }

      try {
        final sessions = await locator<FinanceRepository>().getSessions(schoolId);
        if (sessions.isNotEmpty) {
          final active = sessions.firstWhere(
            (s) => s['is_active'] == true || (s['status']?.toString().toLowerCase() == 'actif'),
            orElse: () => sessions.first,
          );
          sessionId = (active['id'] as num?)?.toInt() ?? 1;
        }
      } catch (_) {}

      await Future.wait<dynamic>([
        locator<StudentsRepository>().getStudentsList().catchError((_) => <Map<String, dynamic>>[]),
        locator<DashboardStatsRepository>().getSummary().catchError((_) => <String, dynamic>{}),
        locator<AcademicsRepository>().getSessions(schoolId).catchError((_) => <Map<String, dynamic>>[]),
        locator<AcademicsRepository>().getPeriods(schoolId, sessionId).catchError((_) => <Map<String, dynamic>>[]),
        locator<AcademicsRepository>().getAllClassesAndSubjects(schoolId).catchError((_) => <Map<String, dynamic>>[]),
        locator<FinanceRepository>().getStudentFeesList(schoolId: schoolId, sessionId: sessionId).catchError((_) => <Map<String, dynamic>>[]),
        locator<FinanceRepository>().getFinanceStats(schoolId: schoolId, sessionId: sessionId).catchError((_) => <String, dynamic>{}),
        locator<PedagogieRepository>().getTeacherClassesAndSubjects().catchError((_) => <Map<String, dynamic>>[]),
        locator<PedagogieRepository>().getSeances().catchError((_) => <Map<String, dynamic>>[]),
        locator<CanteenRepository>().getWeeklyMenu().catchError((_) => null),
        locator<TransportRepository>().getDriverRoutes().catchError((_) => <Map<String, dynamic>>[]),
      ]);
      await updateLastSyncTime();
      debugPrint("✅ SyncEngine: Offline cache hydrated successfully for school $schoolId, session $sessionId.");
    } catch (e) {
      debugPrint("⚠️ SyncEngine: Preload warning: $e");
    }
  }

  void _updateConnectionStatus(List<ConnectivityResult> results) {
    final hasConnection = results.any((result) => result != ConnectivityResult.none);
    isOnlineNotifier.value = hasConnection;
    debugPrint("📶 Connectivity Status: ${hasConnection ? 'ONLINE' : 'OFFLINE'}");
  }

  Future<void> updateLastSyncTime() async {
    final now = DateTime.now();
    lastSyncNotifier.value = now;
    try {
      if (Hive.isBoxOpen(OfflineQueueManager.boxQueueName)) {
        final box = Hive.box(OfflineQueueManager.boxQueueName);
        await box.put('last_sync_time', now.toIso8601String());
      }
    } catch (_) {}
  }

  /// Ensures the Supabase access token is fresh before replaying queued operations
  Future<bool> _ensureFreshAuthToken({bool forceRefresh = false}) async {
    try {
      var currentSession = _client.auth.currentSession;
      final sessionManager = locator.isRegistered<SessionManager>()
          ? locator<SessionManager>()
          : null;

      // 1. If currentSession is null or forceRefresh, try to recover session using saved refreshToken
      if (currentSession == null || forceRefresh) {
        if (sessionManager != null) {
          final savedRefreshToken = await sessionManager.getRefreshToken();
          if (savedRefreshToken != null && savedRefreshToken.isNotEmpty) {
            debugPrint("🔑 SyncEngine: Restoring session via saved refreshToken...");
            try {
              final res = await _client.auth.setSession(savedRefreshToken);
              currentSession = res.session ?? currentSession;
              if (res.session?.accessToken != null) {
                await sessionManager.updateAccessToken(
                  res.session!.accessToken,
                  res.session?.refreshToken,
                );
                debugPrint("✅ SyncEngine: Session restored from refreshToken successfully.");
                return true;
              }
            } catch (e) {
              debugPrint("⚠️ SyncEngine: setSession via refreshToken failed: $e");
            }
          }
        }
      }

      // 2. If session exists and is expired or near-expiry (or forceRefresh)
      if (currentSession != null) {
        final expiresAt = currentSession.expiresAt;
        final isNearExpiry = expiresAt != null &&
            DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000)
                .isBefore(DateTime.now().add(const Duration(minutes: 5)));

        if (currentSession.isExpired || isNearExpiry || forceRefresh) {
          debugPrint("🔑 SyncEngine: Refreshing expired/near-expiry session token...");
          final response = await _client.auth.refreshSession();
          final newAccessToken = response.session?.accessToken;
          if (newAccessToken != null && newAccessToken.isNotEmpty) {
            if (sessionManager != null) {
              await sessionManager.updateAccessToken(
                newAccessToken,
                response.session?.refreshToken,
              );
            }
            debugPrint("✅ SyncEngine: Access token refreshed successfully.");
            return true;
          }
        } else {
          return true; // Current token is already fresh
        }
      }
    } catch (e) {
      debugPrint("⚠️ SyncEngine: Token refresh warning: $e");
    }
    return false;
  }

  /// Manually trigger queue processing
  Future<({int successCount, int failedCount})> triggerSync() async {
    if (isSyncingNotifier.value || !isOnlineNotifier.value) {
      return (successCount: 0, failedCount: 0);
    }

    final pending = _queueManager.getPendingOperations();
    if (pending.isEmpty) {
      // Even if no pending ops, update sync time on request
      await updateLastSyncTime();
      return (successCount: 0, failedCount: 0);
    }

    // Refresh token before draining queue to ensure valid authorization
    await _ensureFreshAuthToken();

    isSyncingNotifier.value = true;
    debugPrint("🔄 SyncEngine: Starting sync for ${pending.length} pending operations.");

    int successCount = 0;
    int failedCount = 0;

    try {
      for (var op in pending) {
        if (!isOnlineNotifier.value) {
          debugPrint("📵 SyncEngine: Lost connection during sync. Pausing.");
          break;
        }

        try {
          var res = await _replayOperationWithDetails(op);

          // If session expired error, attempt immediate token refresh and retry once
          if (!res.success) {
            final firstErr = res.error ?? '';
            final isSessionError = firstErr.contains("Session mobile invalide") ||
                firstErr.contains("Token mobile") ||
                firstErr.contains("Session mobile absente") ||
                firstErr.contains("jwt expired");

            if (isSessionError) {
              debugPrint("🔐 SyncEngine: Session error on op ${op.id}. Attempting immediate refresh...");
              final refreshed = await _ensureFreshAuthToken(forceRefresh: true);
              if (refreshed) {
                res = await _replayOperationWithDetails(op);
              }
            }
          }

          if (res.success) {
            await _queueManager.dequeue(op.id);
            successCount++;
          } else {
            final errorMsg = res.error ?? "Replay returned false (hors-ligne ou rejet serveur)";
            final isSessionError = errorMsg.contains("Session mobile invalide") ||
                errorMsg.contains("Token mobile") ||
                errorMsg.contains("Session mobile absente") ||
                errorMsg.contains("jwt expired");

            if (isSessionError) {
              // Pause without losing data: do NOT count towards max retries / DLQ
              debugPrint("⏸️ SyncEngine: Session expired for op ${op.id}. Keeping safe in queue.");
              await _queueManager.incrementRetry(
                op.id,
                error: "Session mobile expirée. Reconnexion requise.",
              );
              failedCount++;
              break;
            }

            final isFatalBusinessError = res.isBusinessError ||
                errorMsg.contains("verrouill") ||
                errorMsg.contains("Accès refusé") ||
                errorMsg.contains("introuvable") ||
                errorMsg.contains("non autoris");

            if (isFatalBusinessError || op.retryCount >= OfflineOperation.maxRetries) {
              final reason = isFatalBusinessError
                  ? "Rejet métier permanent: $errorMsg"
                  : "Exceeded max retries (${OfflineOperation.maxRetries}). Last error: $errorMsg";
              debugPrint("☠️ SyncEngine: Operation ${op.id} moving to Dead-Letter Queue. Reason: $reason");
              await _queueManager.moveToDeadLetter(op.id, reason: reason);
              failedCount++;
            } else {
              await _queueManager.incrementRetry(op.id, error: errorMsg);
              failedCount++;
              debugPrint("⚠️ SyncEngine: Operation ${op.id} failed (retry ${op.retryCount + 1}/${OfflineOperation.maxRetries}): $errorMsg");
            }
          }
        } catch (opError) {
          debugPrint("❌ SyncEngine: Exception replaying operation ${op.id}: $opError");
          final errorMsg = opError.toString();
          final isFatalBusinessError = errorMsg.contains("verrouill") ||
              errorMsg.contains("Accès refusé") ||
              errorMsg.contains("introuvable") ||
              errorMsg.contains("non autoris");

          if (isFatalBusinessError || op.retryCount >= OfflineOperation.maxRetries) {
            await _queueManager.moveToDeadLetter(op.id, reason: errorMsg);
          } else {
            await _queueManager.incrementRetry(op.id, error: errorMsg);
          }
          failedCount++;
        }
      }

      if (failedCount == 0) {
        await updateLastSyncTime();
      }

      debugPrint("🔄 SyncEngine: Sync complete — ✅ $successCount succeeded, ❌ $failedCount failed/deferred.");
      return (successCount: successCount, failedCount: failedCount);
    } catch (e) {
      debugPrint("❌ SyncEngine: Unexpected error during sync: $e");
      return (successCount: successCount, failedCount: failedCount);
    } finally {
      isSyncingNotifier.value = false;
      debugPrint("🔄 SyncEngine: Sync process finished.");
    }
  }

  /// Wraps _replayOperation to return structured success, error, and business conflict classification
  Future<({bool success, String? error, bool isBusinessError})> _replayOperationWithDetails(OfflineOperation op) async {
    try {
      if (op.table == 'fee_payments' && op.action == 'record_payment') {
        final repo = locator<FinanceRepository>();
        final data = op.data;
        final res = await repo.recordPayment(
          feeId: (data['feeId'] as num?)?.toInt() ?? int.tryParse(data['feeId']?.toString() ?? '') ?? 0,
          schoolId: (data['schoolId'] as num?)?.toInt() ?? int.tryParse(data['schoolId']?.toString() ?? '') ?? 0,
          amount: (data['amount'] as num?)?.toDouble() ?? double.tryParse(data['amount']?.toString() ?? '') ?? 0.0,
          reduction: (data['reduction'] as num?)?.toDouble() ?? double.tryParse(data['reduction']?.toString() ?? '') ?? 0.0,
          paymentMode: data['paymentMode']?.toString() ?? 'Espèces',
          reference: data['reference']?.toString() ?? '',
          monthConcerned: data['monthConcerned']?.toString() ?? '',
          recordedBy: data['recordedBy']?.toString() ?? '',
          currentPaid: (data['currentPaid'] as num?)?.toDouble() ?? double.tryParse(data['currentPaid']?.toString() ?? '') ?? 0.0,
          currentReduction: (data['currentReduction'] as num?)?.toDouble() ?? double.tryParse(data['currentReduction']?.toString() ?? '') ?? 0.0,
          totalExpected: (data['totalExpected'] as num?)?.toDouble() ?? double.tryParse(data['totalExpected']?.toString() ?? '') ?? 0.0,
          isFromSync: true,
        );

        if (res['success'] == true && res['isOffline'] != true) {
          return (success: true, error: null, isBusinessError: false);
        }
        final err = res['error']?.toString();
        final isBiz = err != null && (err.contains("Accès refusé") || err.contains("introuvable"));
        return (success: false, error: err, isBusinessError: isBiz);
      }

      if (op.table == 'student_results' && op.action == 'save_grades') {
        final repo = locator<AcademicsRepository>();
        final data = op.data;
        final rawGrades = data['grades'];
        if (rawGrades == null || rawGrades is! List || rawGrades.isEmpty) {
          return (success: true, error: null, isBusinessError: false);
        }
        final res = await repo.saveStudentGrades(
          grades: List<Map<String, dynamic>>.from(rawGrades.map((e) => Map<String, dynamic>.from(e as Map))),
          isFromSync: true,
        );
        if (res['success'] == true && res['isOffline'] != true) {
          return (success: true, error: null, isBusinessError: false);
        }
        final err = res['error']?.toString();
        final isBiz = err != null && (err.contains("verrouill") || err.contains("Accès refusé") || err.contains("introuvable"));
        return (success: false, error: err, isBusinessError: isBiz);
      }

      if (op.table == 'student_results' && op.action == 'save_devoirs') {
        final repo = locator<AcademicsRepository>();
        final data = op.data;
        final rawDevoirs = data['devoirsList'];
        if (rawDevoirs == null || rawDevoirs is! List || rawDevoirs.isEmpty) {
          return (success: true, error: null, isBusinessError: false);
        }
        final res = await repo.saveDevoirGrades(
          devoirsList: List<Map<String, dynamic>>.from(rawDevoirs.map((e) => Map<String, dynamic>.from(e as Map))),
          isFromSync: true,
        );
        if (res['success'] == true && res['isOffline'] != true) {
          return (success: true, error: null, isBusinessError: false);
        }
        final err = res['error']?.toString();
        final isBiz = err != null && (err.contains("verrouill") || err.contains("Accès refusé") || err.contains("introuvable"));
        return (success: false, error: err, isBusinessError: isBiz);
      }

      final success = await _replayOperation(op);
      return (success: success, error: success ? null : "Échec de rejeu", isBusinessError: false);
    } catch (e) {
      final msg = e.toString();
      final isBiz = msg.contains("verrouill") || msg.contains("Accès refusé") || msg.contains("introuvable");
      return (success: false, error: msg, isBusinessError: isBiz);
    }
  }

  /// Replay a single operation on Supabase or the corresponding repository
  Future<bool> _replayOperation(OfflineOperation op) async {
    debugPrint("🔁 Replaying Operation -> ID: ${op.id}, Table: ${op.table}, Action: ${op.action}");
    
    try {
      if (op.table == 'student_attendance' && op.action == 'batch_attendance') {
        final repo = locator<AttendanceRepository>();
        final data = op.data;
        
        final res = await repo.saveStudentBatchAttendance(
          classId: data['classId'] as int,
          dateStr: data['dateStr'] as String,
          subjectId: data['subjectId'] as int?,
          employeeId: data['employeeId'] as int?,
          records: List<Map<String, dynamic>>.from(
            (data['records'] as List).map((e) => Map<String, dynamic>.from(e as Map))
          ),
          sendSMS: data['sendSMS'] as bool? ?? false,
          sendWhatsApp: data['sendWhatsApp'] as bool? ?? false,
        );
        
        return res['success'] == true;
      } 
      
      else if (op.table == 'cahier_textes' && op.action == 'create_seance') {
        final repo = locator<PedagogieRepository>();
        final data = op.data;
        
        final res = await repo.createSeance(
          classId: data['classId'] as int,
          subjectId: data['subjectId'] as int,
          employeeId: data['employeeId'] as int,
          sessionDate: data['sessionDate'] as String,
          titreLecon: data['titreLecon'] as String,
          heureDebut: data['heureDebut'] as String?,
          heureFin: data['heureFin'] as String?,
          objectifs: data['objectifs'] as String?,
          contenuRealise: data['contenuRealise'] as String?,
          supportsUtilises: data['supportsUtilises'] as String?,
          devoirDonne: data['devoirDonne'] as String?,
          observation: data['observation'] as String?,
          anneeScolaire: data['anneeScolaire'] as String?,
        );
        
        return res.isNotEmpty && res['_isOffline'] != true;
      }

      else if (op.table == 'cahier_textes' && op.action == 'update_seance') {
        final repo = locator<PedagogieRepository>();
        final data = op.data;
        
        await repo.updateSeance(
          data['id'] as int,
          titreLecon: data['titreLecon'] as String?,
          sessionDate: data['sessionDate'] as String?,
          heureDebut: data['heureDebut'] as String?,
          heureFin: data['heureFin'] as String?,
          objectifs: data['objectifs'] as String?,
          contenuRealise: data['contenuRealise'] as String?,
          supportsUtilises: data['supportsUtilises'] as String?,
          devoirDonne: data['devoirDonne'] as String?,
          observation: data['observation'] as String?,
          statut: data['statut'] as String?,
        );
        
        return true;
      }
      
      else if (op.table == 'student_results' && op.action == 'save_grades') {
        final repo = locator<AcademicsRepository>();
        final data = op.data;
        
        final rawGrades = data['grades'];
        if (rawGrades == null || rawGrades is! List || rawGrades.isEmpty) {
          debugPrint("⚠️ SyncEngine: Invalid or empty grades in save_grades queue. Dequeueing.");
          return true;
        }

        final res = await repo.saveStudentGrades(
          grades: List<Map<String, dynamic>>.from(
            rawGrades.map((e) => Map<String, dynamic>.from(e as Map))
          ),
          isFromSync: true,
        );
        
        return res['success'] == true && res['isOffline'] != true;
      } 
      
      else if (op.table == 'student_results' && op.action == 'save_devoirs') {
        final repo = locator<AcademicsRepository>();
        final data = op.data;
        
        final rawDevoirs = data['devoirsList'];
        if (rawDevoirs == null || rawDevoirs is! List || rawDevoirs.isEmpty) {
          debugPrint("⚠️ SyncEngine: Invalid or empty devoirsList in save_devoirs queue. Dequeueing.");
          return true;
        }

        final res = await repo.saveDevoirGrades(
          devoirsList: List<Map<String, dynamic>>.from(
            rawDevoirs.map((e) => Map<String, dynamic>.from(e as Map))
          ),
          isFromSync: true,
        );
        
        return res['success'] == true && res['isOffline'] != true;
      } 
      
      else if (op.table == 'grade_workflow' && op.action == 'update_workflow_status') {
        final repo = locator<AcademicsRepository>();
        final data = op.data;
        
        final res = await repo.updateGradeWorkflowStatus(
          classId: (data['classId'] as num?)?.toInt() ?? int.tryParse(data['classId']?.toString() ?? '') ?? 0,
          subjectId: (data['subjectId'] as num?)?.toInt() ?? int.tryParse(data['subjectId']?.toString() ?? '') ?? 0,
          sessionId: (data['sessionId'] as num?)?.toInt() ?? int.tryParse(data['sessionId']?.toString() ?? '') ?? 0,
          period: data['period']?.toString() ?? '',
          targetAction: data['targetAction']?.toString() ?? '',
          observation: data['observation'] as String?,
          schoolId: (data['schoolId'] as num?)?.toInt() ?? int.tryParse(data['schoolId']?.toString() ?? ''),
          isFromSync: true,
        );
        
        return res['success'] == true && res['isOffline'] != true;
      } 
      
      else if (op.table == 'fee_payments' && op.action == 'record_payment') {
        final repo = locator<FinanceRepository>();
        final data = op.data;
        
        final res = await repo.recordPayment(
          feeId: (data['feeId'] as num?)?.toInt() ?? int.tryParse(data['feeId']?.toString() ?? '') ?? 0,
          schoolId: (data['schoolId'] as num?)?.toInt() ?? int.tryParse(data['schoolId']?.toString() ?? '') ?? 0,
          amount: (data['amount'] as num?)?.toDouble() ?? double.tryParse(data['amount']?.toString() ?? '') ?? 0.0,
          reduction: (data['reduction'] as num?)?.toDouble() ?? double.tryParse(data['reduction']?.toString() ?? '') ?? 0.0,
          paymentMode: data['paymentMode']?.toString() ?? 'Espèces',
          reference: data['reference']?.toString() ?? '',
          monthConcerned: data['monthConcerned']?.toString() ?? '',
          recordedBy: data['recordedBy']?.toString() ?? '',
          currentPaid: (data['currentPaid'] as num?)?.toDouble() ?? double.tryParse(data['currentPaid']?.toString() ?? '') ?? 0.0,
          currentReduction: (data['currentReduction'] as num?)?.toDouble() ?? double.tryParse(data['currentReduction']?.toString() ?? '') ?? 0.0,
          totalExpected: (data['totalExpected'] as num?)?.toDouble() ?? double.tryParse(data['totalExpected']?.toString() ?? '') ?? 0.0,
          isFromSync: true,
        );
        
        return res['success'] == true && res['isOffline'] != true;
      } 
      
      // Handle direct HTTP API requests queued offline
      else if (op.table.startsWith('/api/') || op.table.startsWith('api/')) {
        final client = locator.isRegistered<MobileApiClient>()
            ? locator<MobileApiClient>()
            : MobileApiClient();
        final path = op.table.startsWith('/') ? op.table : '/${op.table}';
        
        switch (op.action.toUpperCase()) {
          case 'POST':
            await client.postJson(path, op.data);
            return true;
          case 'PUT':
            await client.putJson(path, op.data);
            return true;
          case 'PATCH':
            await client.patchJson(path, op.data);
            return true;
          case 'DELETE':
            await client.deleteJson(path);
            return true;
          default:
            await client.postJson(path, op.data);
            return true;
        }
      }

      // Unified REST API Sync endpoint with Server-side Validation & RLS/Tenant verification
      else {
        final client = locator.isRegistered<MobileApiClient>()
            ? locator<MobileApiClient>()
            : MobileApiClient();

        final response = await client.postJson('/api/mobile/sync', {
          'table': op.table,
          'action': op.action,
          'data': op.data,
          'id': op.id,
          'timestamp': op.timestamp,
          'idempotencyKey': op.idempotencyKey,
        });

        if (response['success'] == true) {
          // 🔗 If this was a newly registered student, check for results or data with realId
          final results = response['results'] as List?;
          if (results != null && results.isNotEmpty) {
            for (final r in results) {
              final localId = r['localId']?.toString();
              final realId = r['realId'];
              if (localId != null && realId != null) {
                await _queueManager.remapTemporaryId(
                  temporaryId: localId,
                  permanentId: realId,
                );
              }
            }
          }
          return true;
        }

        return false;
      }
    } catch (e) {
      debugPrint("❌ Error replaying operation ${op.id}: $e");
      return false;
    }
  }
}
