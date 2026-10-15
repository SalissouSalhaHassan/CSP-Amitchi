import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/api/offline_queue_manager.dart';
import '../../../core/api/offline_store_manager.dart';
import '../../../core/api/supabase_client.dart';
import '../../../core/api/mobile_api_client.dart';
import '../../../core/api/sync_engine.dart';
import '../../../core/di/injection.dart';
import '../../../core/utils/educational_level_helper.dart';

class FinanceRepository {
  final MobileApiClient _apiClient;
  final SupabaseClient _client;

  FinanceRepository({MobileApiClient? apiClient, SupabaseClient? client})
      : _apiClient = apiClient ?? MobileApiClient(),
        _client = client ?? SupabaseClientManager().client;

  String _feesCacheKey(int schoolId, int sessionId) =>
      "student_fees_${schoolId}_$sessionId";

  String _statsCacheKey(int schoolId, int sessionId) =>
      "finance_stats_${schoolId}_$sessionId";

  String _paymentsCacheKey(int feeId) => "fee_payments_$feeId";

  String _sessionsCacheKey(int schoolId) => "finance_sessions_$schoolId";

  Future<void> _updateCachedFeeAfterPayment({
    required int feeId,
    required double newPaid,
    required double newReduction,
    required double newBalance,
    required String newStatus,
  }) async {
    if (!Hive.isBoxOpen(OfflineStoreManager.boxStudentFees)) {
      return;
    }

    final box = Hive.box(OfflineStoreManager.boxStudentFees);
    final keys = box.keys.cast<dynamic>().map((e) => e.toString()).toList();

    for (final key in keys) {
      if (!key.startsWith('student_fees_')) {
        continue;
      }

      final cachedFees = box.get(key);
      if (cachedFees is! List) {
        continue;
      }

      bool updated = false;
      final mappedFees = cachedFees.map((item) {
        if (item is! Map) return item;
        final fee = Map<String, dynamic>.from(item);
        final currentId = (fee['id'] as num?)?.toInt();
        if (currentId == feeId) {
          fee['total_paid'] = newPaid;
          fee['total_reduction'] = newReduction;
          fee['balance'] = newBalance;
          fee['status'] = newStatus;
          updated = true;
        }
        return fee;
      }).toList();

      if (updated) {
        await box.put(key, mappedFees);

        final parts = key.split('_');
        if (parts.length >= 4) {
          final schoolId = int.tryParse(parts[2]);
          final sessionId = int.tryParse(parts[3]);
          if (schoolId != null && sessionId != null) {
            await _refreshStatsCacheFromFees(
              schoolId: schoolId,
              sessionId: sessionId,
              fees: mappedFees
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList(),
            );
          }
        }
      }
    }
  }

  Map<String, dynamic> _buildStatsFromFees(List<Map<String, dynamic>> fees) {
    double totalExpected = 0.0;
    double totalCollected = 0.0;
    double totalDebts = 0.0;

    for (final row in fees) {
      totalExpected += (row['total_expected'] as num?)?.toDouble() ?? 0.0;
      totalCollected += (row['total_paid'] as num?)?.toDouble() ?? 0.0;
      totalDebts += (row['balance'] as num?)?.toDouble() ?? 0.0;
    }

    return {
      'success': true,
      'stats': {
        'totalExpected': totalExpected,
        'totalCollected': totalCollected,
        'totalDebts': totalDebts,
      },
    };
  }

  Future<void> _refreshStatsCacheFromFees({
    required int schoolId,
    required int sessionId,
    required List<Map<String, dynamic>> fees,
  }) async {
    final cacheManager = locator<OfflineStoreManager>();
    final stats = _buildStatsFromFees(fees);
    await cacheManager.saveDataList(
      boxName: OfflineStoreManager.boxStudentFees,
      key: _statsCacheKey(schoolId, sessionId),
      data: [stats],
    );
  }

  /// Fetch financial statistics for a school and session
  Future<Map<String, dynamic>> getFinanceStats({
    required int schoolId,
    required int sessionId,
  }) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = _statsCacheKey(schoolId, sessionId);

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("Offline Mode: Fetching finance stats from local cache.");
      final cachedList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
      if (cachedList.isNotEmpty) {
        return Map<String, dynamic>.from(cachedList.first);
      }

      final cachedFees = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: _feesCacheKey(schoolId, sessionId),
      );
      if (cachedFees.isNotEmpty) {
        return _buildStatsFromFees(cachedFees);
      }

      return {
        'success': false,
        'error': 'Pas de connexion internet et aucune donnee en cache.',
      };
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/finance/summary?action=getFinanceStats&schoolId=$schoolId&sessionId=$sessionId',
      );
      
      final result = Map<String, dynamic>.from(response);

      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
        data: [result],
      );

      return result;
    } catch (e) {
      debugPrint("Error fetching finance stats: $e");
      final cachedList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
      if (cachedList.isNotEmpty) {
        return Map<String, dynamic>.from(cachedList.first);
      }
      return {
        'success': false,
        'error': 'Erreur lors de la recuperation des statistiques: $e',
      };
    }
  }

  /// Get list of student fees for a session and school
  Future<List<Map<String, dynamic>>> getStudentFeesList({
    required int schoolId,
    required int sessionId,
  }) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = _feesCacheKey(schoolId, sessionId);

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("Offline Mode: Fetching student fees from local cache.");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/finance/invoices?action=getStudentFeesList&schoolId=$schoolId&sessionId=$sessionId',
      );

      final list = List<Map<String, dynamic>>.from(response['data'] ?? []);
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
        data: list,
      );
      await _refreshStatsCacheFromFees(
        schoolId: schoolId,
        sessionId: sessionId,
        fees: list,
      );
      return list;
    } catch (e) {
      debugPrint("Error fetching student fees list: $e");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
    }
  }

  /// Fetch payment history for a specific student fee ID
  Future<List<Map<String, dynamic>>> getFeePayments(int feeId) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = _paymentsCacheKey(feeId);

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("Offline Mode: Fetching fee payments from local cache.");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
      );
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/finance/payments?action=getFeePayments&feeId=$feeId',
      );

      final list = List<Map<String, dynamic>>.from(response['data'] ?? []);
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
        data: list,
      );
      return list;
    } catch (e) {
      debugPrint("Error fetching fee payments: $e");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
      );
    }
  }

  String _journalCacheKey(int schoolId, int? sessionId) =>
      "payments_journal_${schoolId}_${sessionId ?? 'all'}";

  Future<void> _updateJournalCacheAfterPayment({
    required int schoolId,
    required Map<String, dynamic> payment,
  }) async {
    try {
      final cacheManager = locator<OfflineStoreManager>();
      final feeId = payment['fee_id'] ?? payment['feeId'];
      String? studentName = payment['student_name'];
      String? numAdmission = payment['num_admission'];

      if ((studentName == null || numAdmission == null) && Hive.isBoxOpen(OfflineStoreManager.boxStudentFees)) {
        final box = Hive.box(OfflineStoreManager.boxStudentFees);
        for (var key in box.keys) {
          if (!key.toString().startsWith('student_fees_')) continue;
          final fees = box.get(key);
          if (fees is List) {
            for (var item in fees) {
              if (item is Map && (item['id'] == feeId || (item['id'] as num?)?.toInt() == feeId)) {
                final s = item['students'] is Map ? item['students'] : item;
                studentName ??= s['nom_etudiant'] ?? s['nomPrenom'] ?? s['name'];
                numAdmission ??= s['num_admission'] ?? s['matricule'];
                break;
              }
            }
          }
          if (studentName != null) break;
        }
      }

      final enrichedPayment = {
        ...payment,
        'student_name': studentName ?? 'أ‰lأ¨ve',
        'num_admission': numAdmission ?? '',
        'is_pending_sync': payment['is_pending_sync'] ?? false,
      };

      final journalKeys = [
        _journalCacheKey(schoolId, null),
        "payments_journal_${schoolId}_all",
      ];

      for (final jKey in journalKeys) {
        final cachedJournal = cacheManager.getDataList(
          boxName: OfflineStoreManager.boxFeePayments,
          key: jKey,
        );
        final filtered = cachedJournal.where((p) => p['reference'] != enrichedPayment['reference']).toList();
        await cacheManager.saveDataList(
          boxName: OfflineStoreManager.boxFeePayments,
          key: jKey,
          data: [enrichedPayment, ...filtered],
        );
      }
    } catch (e) {
      debugPrint("Warning: could not update journal cache after payment: $e");
    }
  }

  /// Fetch full payments journal (Journal de caisse)
  Future<List<Map<String, dynamic>>> getPaymentsJournal({
    required int schoolId,
    int? sessionId,
  }) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = _journalCacheKey(schoolId, sessionId);

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("Offline Mode: Fetching payments journal from local cache.");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
      );
    }

    try {
      final sessionParam = sessionId != null ? '&sessionId=$sessionId' : '';
      final response = await _apiClient.getJson(
        '/api/mobile/finance/payments?action=getPaymentsJournal&schoolId=$schoolId$sessionParam',
      );

      final list = List<Map<String, dynamic>>.from(response['data'] ?? []);
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
        data: list,
      );
      return list;
    } catch (e) {
      debugPrint("Error fetching payments journal: $e");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: cacheKey,
      );
    }
  }

  /// Record a payment and update the student fee balance
  Future<Map<String, dynamic>> recordPayment({
    required int feeId,
    required int schoolId,
    required double amount,
    required double reduction,
    required String paymentMode,
    required String reference,
    required String monthConcerned,
    required String recordedBy,
    required double currentPaid,
    required double currentReduction,
    required double totalExpected,
    bool isFromSync = false,
  }) async {
    final syncEngine = locator<SyncEngine>();
    final queueManager = locator<OfflineQueueManager>();
    final cacheManager = locator<OfflineStoreManager>();

    final double newPaid = currentPaid + amount;
    final double newReduction = currentReduction + reduction;
    final double newBalance = totalExpected - newPaid - newReduction;

    String newStatus = "Impaye";
    if (newBalance <= 0) {
      newStatus = "Solde";
    } else if (newPaid > 0) {
      newStatus = "Partiel";
    }

    final String receiptRef = reference.trim().isNotEmpty
        ? reference.trim()
        : 'REC-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
    final int offlinePaymentId = DateTime.now().millisecondsSinceEpoch;

    if (!syncEngine.isOnlineNotifier.value) {
      if (isFromSync) {
        return {
          'success': false,
          'error': 'Connexion indisponible pour le moment.',
          'isOffline': true,
        };
      }

      debugPrint("Offline Mode: Queueing fee payment locally with ref: $receiptRef");
      await queueManager.enqueue(
        table: 'fee_payments',
        action: 'record_payment',
        data: {
          'feeId': feeId,
          'schoolId': schoolId,
          'amount': amount,
          'reduction': reduction,
          'paymentMode': paymentMode,
          'reference': receiptRef,
          'monthConcerned': monthConcerned,
          'recordedBy': recordedBy,
          'currentPaid': currentPaid,
          'currentReduction': currentReduction,
          'totalExpected': totalExpected,
        },
      );

      final paymentCacheKey = _paymentsCacheKey(feeId);
      final cachedPayments = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: paymentCacheKey,
      );
      final localPayment = {
        'id': offlinePaymentId,
        'fee_id': feeId,
        'school_id': schoolId,
        'amount': amount,
        'reduction': reduction,
        'payment_mode': paymentMode,
        'reference': receiptRef,
        'month_concerned': monthConcerned.isNotEmpty ? monthConcerned : null,
        'date_paid': DateTime.now().toIso8601String(),
        'recorded_by': recordedBy,
        'is_pending_sync': true,
      };
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: paymentCacheKey,
        data: [localPayment, ...cachedPayments],
      );

      await _updateCachedFeeAfterPayment(
        feeId: feeId,
        newPaid: newPaid,
        newReduction: newReduction,
        newBalance: newBalance,
        newStatus: newStatus,
      );

      await _updateJournalCacheAfterPayment(
        schoolId: schoolId,
        payment: localPayment,
      );

      return {
        'success': true,
        'payment': localPayment,
        'paymentId': offlinePaymentId,
        'reference': receiptRef,
        'queued': true,
        'isOffline': true,
        'newPaid': newPaid,
        'newReduction': newReduction,
        'newBalance': newBalance,
        'newStatus': newStatus,
      };
    }

    try {
      final response = await _apiClient.postJson(
        '/api/mobile/finance/payments',
        {
          'action': 'recordPayment',
          'payload': {
            'feeId': feeId,
            'schoolId': schoolId,
            'amount': amount,
            'reduction': reduction,
            'paymentMode': paymentMode,
            'reference': receiptRef,
            'monthConcerned': monthConcerned,
            'recordedBy': recordedBy,
            'currentPaid': currentPaid,
            'currentReduction': currentReduction,
            'totalExpected': totalExpected,
          },
        },
      );

      if (response['success'] == true) {
        final paymentResponse = response['payment'] is Map<String, dynamic>
            ? Map<String, dynamic>.from(response['payment'] as Map)
            : <String, dynamic>{};
        final resolvedRef = (paymentResponse['reference'] != null && paymentResponse['reference'].toString().trim().isNotEmpty)
            ? paymentResponse['reference'].toString().trim()
            : receiptRef;
        paymentResponse['reference'] = resolvedRef;
        final resolvedId = paymentResponse['id'] ?? offlinePaymentId;

        await _updateCachedFeeAfterPayment(
          feeId: feeId,
          newPaid: newPaid,
          newReduction: newReduction,
          newBalance: newBalance,
          newStatus: newStatus,
        );

        await _updateJournalCacheAfterPayment(
          schoolId: schoolId,
          payment: paymentResponse.isNotEmpty ? paymentResponse : {
            'id': resolvedId,
            'fee_id': feeId,
            'school_id': schoolId,
            'amount': amount,
            'reduction': reduction,
            'payment_mode': paymentMode,
            'reference': resolvedRef,
            'month_concerned': monthConcerned.isNotEmpty ? monthConcerned : null,
            'date_paid': DateTime.now().toIso8601String(),
            'recorded_by': recordedBy,
            'is_pending_sync': false,
          },
        );

        return {
          'success': true,
          'payment': paymentResponse,
          'paymentId': resolvedId,
          'reference': resolvedRef,
        };
      } else {
        return {
          'success': false,
          'error': response['error'] ?? 'Erreur inconnue',
        };
      }
    } catch (e) {
      if (isFromSync) {
        debugPrint("SyncEngine: Error during sync replay of payment $receiptRef: $e");
        return {
          'success': false,
          'error': e.toString(),
          'isOffline': true,
        };
      }

      debugPrint("Error recording payment online: $e. Falling back to offline local queue.");
      await queueManager.enqueue(
        table: 'fee_payments',
        action: 'record_payment',
        data: {
          'feeId': feeId,
          'schoolId': schoolId,
          'amount': amount,
          'reduction': reduction,
          'paymentMode': paymentMode,
          'reference': receiptRef,
          'monthConcerned': monthConcerned,
          'recordedBy': recordedBy,
          'currentPaid': currentPaid,
          'currentReduction': currentReduction,
          'totalExpected': totalExpected,
        },
      );

      final paymentCacheKey = _paymentsCacheKey(feeId);
      final cachedPayments = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: paymentCacheKey,
      );
      final localPayment = {
        'id': offlinePaymentId,
        'fee_id': feeId,
        'school_id': schoolId,
        'amount': amount,
        'reduction': reduction,
        'payment_mode': paymentMode,
        'reference': receiptRef,
        'month_concerned': monthConcerned.isNotEmpty ? monthConcerned : null,
        'date_paid': DateTime.now().toIso8601String(),
        'recorded_by': recordedBy,
        'is_pending_sync': true,
      };
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxFeePayments,
        key: paymentCacheKey,
        data: [localPayment, ...cachedPayments],
      );

      await _updateCachedFeeAfterPayment(
        feeId: feeId,
        newPaid: newPaid,
        newReduction: newReduction,
        newBalance: newBalance,
        newStatus: newStatus,
      );

      await _updateJournalCacheAfterPayment(
        schoolId: schoolId,
        payment: localPayment,
      );

      return {
        'success': true,
        'payment': localPayment,
        'paymentId': offlinePaymentId,
        'reference': receiptRef,
        'queued': true,
        'isOffline': true,
        'newPaid': newPaid,
        'newReduction': newReduction,
        'newBalance': newBalance,
        'newStatus': newStatus,
      };
    }
  }

  /// Fetch active academic sessions for the school
  Future<List<Map<String, dynamic>>> getSessions(int schoolId) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = _sessionsCacheKey(schoolId);

    // 1. Check local cache first if offline
    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("📶 Offline Mode: Fetching finance sessions from local cache.");
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxSchoolSessions,
        key: cacheKey,
      );
      if (cached.isNotEmpty) return cached;

      // Fallback to academics sessions cache
      final academicsCached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxSchoolSessions,
        key: "sessions_$schoolId",
      );
      if (academicsCached.isNotEmpty) return academicsCached;

      // Safe offline fallback session
      return [
        {
          'id': 16,
          'session_name': '2026-2027',
          'is_active': true,
          'status': 'Actif',
          'school_id': schoolId,
        }
      ];
    }

    // 2. Online fetch
    try {
      final response = await _apiClient.getJson(
        '/api/mobile/finance/summary?action=getSessions&schoolId=$schoolId',
      );

      var list = List<Map<String, dynamic>>.from(response['data'] ?? []);
      
      // If server returned empty, fallback to active session 2026-2027
      if (list.isEmpty) {
        list = [
          {
            'id': 16,
            'session_name': '2026-2027',
            'is_active': true,
            'status': 'Actif',
            'school_id': schoolId,
          }
        ];
      }

      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxSchoolSessions,
        key: cacheKey,
        data: list,
      );
      // Also cache for generic sessions key
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxSchoolSessions,
        key: "sessions_$schoolId",
        data: list,
      );

      return list;
    } catch (e) {
      debugPrint("Error fetching sessions in finance: $e");
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxSchoolSessions,
        key: cacheKey,
      );
      if (cached.isNotEmpty) return cached;

      return [
        {
          'id': 16,
          'session_name': '2026-2027',
          'is_active': true,
          'status': 'Actif',
          'school_id': schoolId,
        }
      ];
    }
  }

  /// Fetch the official school document header config
  Future<Map<String, dynamic>> getDocumentHeader(int schoolId) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = "document_header_$schoolId";

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("Offline Mode: Fetching document header from local cache.");
      final cachedList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
      if (cachedList.isNotEmpty) {
        return {'success': true, 'data': Map<String, dynamic>.from(cachedList.first)};
      }
      return {'success': false, 'error': 'Aucune configuration d\'en-tأھte en cache.'};
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/document-header',
      );
      
      final data = Map<String, dynamic>.from(response['data'] ?? {});
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
        data: [data],
      );
      return {'success': true, 'data': data};
    } catch (e) {
      debugPrint("Error fetching document header: $e");
      final cachedList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: cacheKey,
      );
      if (cachedList.isNotEmpty) {
        return {'success': true, 'data': Map<String, dynamic>.from(cachedList.first)};
      }
      return {
        'success': false,
        'error': 'Erreur lors du chargement de l\'en-tأھte: $e',
      };
    }
  }

  /// Synchronize student fees school-wide (matching web sync logic with offline fallback)
  Future<Map<String, dynamic>> syncStudentFees({
    required int schoolId,
    required int sessionId,
  }) async {
    final syncEngine = locator.isRegistered<SyncEngine>() ? locator<SyncEngine>() : null;
    final isOnline = syncEngine?.isOnlineNotifier.value ?? true;

    if (!isOnline) {
      debugPrint("Offline Mode: Reconciling student fees locally.");
      return await _reconcileOfflineStudentFees(
        schoolId: schoolId,
        sessionId: sessionId,
      );
    }

    try {
      // 1. Drain pending operations in queue before requesting server sync
      if (syncEngine != null) {
        await syncEngine.triggerSync();
      }

      // 2. Request server-side sync and re-aggregation
      final response = await _apiClient.postJson(
        '/api/mobile/finance/invoices',
        {
          'action': 'syncStudentFees',
          'payload': {
            'schoolId': schoolId,
            'sessionId': sessionId,
          },
        },
      );

      // 3. Immediately refresh local cache with fresh fees and stats from server
      final freshFees = await getStudentFeesList(
        schoolId: schoolId,
        sessionId: sessionId,
      );
      final freshStats = await getFinanceStats(
        schoolId: schoolId,
        sessionId: sessionId,
      );

      return {
        'success': true,
        'message': response['message'] ?? 'Dossiers synchronisأ©s avec succأ¨s.',
        'updated': response['updated'] ?? 0,
        'stats': freshStats['stats'],
        'data': freshFees,
      };
    } catch (e) {
      debugPrint("Error syncing student fees online: $e. Falling back to local offline reconciliation.");
      return await _reconcileOfflineStudentFees(
        schoolId: schoolId,
        sessionId: sessionId,
      );
    }
  }

  /// Perform offline reconciliation of student fee balances and status
  Future<Map<String, dynamic>> _reconcileOfflineStudentFees({
    required int schoolId,
    required int sessionId,
  }) async {
    final cacheManager = locator.isRegistered<OfflineStoreManager>()
        ? locator<OfflineStoreManager>()
        : null;

    if (cacheManager == null) {
      return {
        'success': true,
        'offline': true,
        'inserted': 0,
        'updated': 0,
        'message': 'Mode hors-ligne : Donnأ©es locales vأ©rifiأ©es.',
      };
    }

    try {
      final feesKey = _feesCacheKey(schoolId, sessionId);
      final existingFees = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: feesKey,
      );

      // Check for cached students from students box if any exist
      final studentKeys = [
        'students_$schoolId',
        'students_all_$schoolId',
        'students_list_$schoolId',
      ];

      List<Map<String, dynamic>> allCachedStudents = [];
      for (final sKey in studentKeys) {
        final list = cacheManager.getDataList(
          boxName: OfflineStoreManager.boxStudents,
          key: sKey,
        );
        if (list.isNotEmpty) {
          allCachedStudents = list;
          break;
        }
      }

      final existingStudentIds = <int>{};
      for (final fee in existingFees) {
        final sId = (fee['student_id'] as num?)?.toInt() ??
            (fee['students'] is Map ? (fee['students']['id'] as num?)?.toInt() : null);
        if (sId != null) {
          existingStudentIds.add(sId);
        }
      }

      int inserted = 0;
      int updated = 0;
      final updatedFeesList = <Map<String, dynamic>>[];

      // Reconcile existing fees balances and status
      for (final f in existingFees) {
        final fee = Map<String, dynamic>.from(f);
        final feeId = (fee['id'] as num?)?.toInt();
        final expected = (fee['total_expected'] as num?)?.toDouble() ?? 0.0;
        double paid = (fee['total_paid'] as num?)?.toDouble() ?? 0.0;
        double reduction = (fee['total_reduction'] as num?)?.toDouble() ?? 0.0;

        // Reconcile with any offline payments stored in boxFeePayments
        if (feeId != null) {
          final paymentCacheKey = _paymentsCacheKey(feeId);
          final cachedPayments = cacheManager.getDataList(
            boxName: OfflineStoreManager.boxFeePayments,
            key: paymentCacheKey,
          );
          if (cachedPayments.isNotEmpty) {
            double cachedSum = 0.0;
            double cachedReduc = 0.0;
            for (final p in cachedPayments) {
              cachedSum += (p['amount'] as num?)?.toDouble() ?? 0.0;
              cachedReduc += (p['reduction'] as num?)?.toDouble() ?? 0.0;
            }
            if (cachedSum > paid) {
              paid = cachedSum;
            }
            if (cachedReduc > reduction) {
              reduction = cachedReduc;
            }
          }
        }

        final balance = math.max(0.0, expected - paid - reduction);

        String status = "Impayأ©";
        if (balance <= 0 && expected > 0) {
          status = "Soldأ©";
        } else if (paid > 0) {
          status = "Partiel";
        }

        fee['total_paid'] = paid;
        fee['total_reduction'] = reduction;
        fee['balance'] = balance;
        fee['status'] = status;
        updatedFeesList.add(fee);
        updated++;
      }

      // Add missing students if found in offline student cache
      for (final st in allCachedStudents) {
        final sId = (st['id'] as num?)?.toInt();
        if (sId != null && !existingStudentIds.contains(sId)) {
          final monthly = (st['fraisMensuels'] as num?)?.toDouble() ??
              (st['frais_mensuels'] as num?)?.toDouble() ?? 0.0;
          final inscr = (st['fraisInscription'] as num?)?.toDouble() ??
              (st['frais_inscription'] as num?)?.toDouble() ?? 0.0;
          final oldBal = (st['ancienSolde'] as num?)?.toDouble() ??
              (st['ancien_solde'] as num?)?.toDouble() ?? 0.0;
          final expected = inscr + oldBal + monthly;

          updatedFeesList.add({
            'id': -DateTime.now().millisecondsSinceEpoch - inserted,
            'school_id': schoolId,
            'student_id': sId,
            'session_id': sessionId,
            'total_expected': expected,
            'total_paid': 0.0,
            'total_reduction': 0.0,
            'balance': expected,
            'status': "Impayأ©",
            'students': {
              'id': sId,
              'num_admission': st['num_admission'] ?? st['matricule'] ?? '',
              'nom_etudiant': st['nom_etudiant'] ?? st['name'] ?? '',
              'classe': st['classe'] ?? '',
              'educational_level': st['educational_level'] ?? '',
            },
          });
          existingStudentIds.add(sId);
          inserted++;
        }
      }

      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudentFees,
        key: feesKey,
        data: updatedFeesList,
      );

      await _refreshStatsCacheFromFees(
        schoolId: schoolId,
        sessionId: sessionId,
        fees: updatedFeesList,
      );

      return {
        'success': true,
        'offline': true,
        'inserted': inserted,
        'updated': updated,
        'message': 'Mode hors-ligne : Les dossiers financiers locaux ont أ©tأ© vأ©rifiأ©s et synchronisأ©s.',
      };
    } catch (e) {
      debugPrint("Error in _reconcileOfflineStudentFees: $e");
      return {
        'success': true,
        'offline': true,
        'inserted': 0,
        'updated': 0,
        'message': 'Mode hors-ligne : Donnأ©es financiأ¨res locales prأھtes.',
      };
    }
  }

  /// â”€â”€ RAPPORT FINANCIER UNIFIأ‰ (RECETTES vs Dأ‰PENSES & DETTES) â”€â”€
  /// Fonctionne أ  la fois en ligne et 100% hors-ligne via le cache local Hive
  Future<Map<String, dynamic>> getUnifiedFinancialReport({
    required int schoolId,
    String period = "monthly", // "daily", "monthly", "yearly", "all"
    DateTime? selectedDate,
    String? level,
  }) async {
    final date = selectedDate ?? DateTime.now();
    final dateIso = "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

    // 0. TENTATIVE PRIORITAIRE EN LIGNE : Appeler l'API Web Unifiأ©e directe
    // Cette أ©tape garantit une paritأ© stricte أ  100% avec l'أ©cran Web
    try {
      final lvlParam = level != null && level.isNotEmpty ? '&level=${Uri.encodeComponent(level)}' : '';
      final remoteRes = await _apiClient.getJson(
        '/api/mobile/finance/unified-report?schoolId=$schoolId&period=$period&selectedDate=$dateIso$lvlParam',
      );

      if (remoteRes['success'] == true && remoteRes['data'] is Map) {
        final serverData = Map<String, dynamic>.from(remoteRes['data'] as Map);
        final summary = serverData['summary'] as Map<String, dynamic>? ?? {};
        final breakdowns = serverData['breakdowns'] as Map<String, dynamic>? ?? {};
        final transactions = serverData['transactions'] as Map<String, dynamic>? ?? {};

        final expByCatList = breakdowns['expensesByCategory'] as List? ?? [];
        final Map<String, double> expensesByCategory = {};
        for (var e in expByCatList) {
          if (e is Map) {
            expensesByCategory[e['category']?.toString() ?? 'Gأ©nأ©ral'] =
                (e['amount'] as num?)?.toDouble() ?? 0.0;
          }
        }

        final payByModeList = breakdowns['paymentsByMode'] as List? ?? [];
        final Map<String, double> paymentsByMode = {};
        for (var p in payByModeList) {
          if (p is Map) {
            paymentsByMode[p['mode']?.toString() ?? 'Espأ¨ces'] =
                (p['amount'] as num?)?.toDouble() ?? 0.0;
          }
        }

        final recentPayments = List<Map<String, dynamic>>.from(
          (transactions['recentPayments'] as List? ?? []).map((p) {
            final m = Map<String, dynamic>.from(p as Map);
            return {
              'id': m['id'],
              'title': m['studentName'] ?? 'أ‰lأ¨ve',
              'studentName': m['studentName'] ?? 'أ‰lأ¨ve',
              'classe': m['classe'] ?? '-',
              'educational_level': m['educationalLevel'],
              'reference': m['reference'] ?? 'REC-${m['id'] ?? ''}',
              'amount': (m['amount'] as num?)?.toDouble() ?? 0.0,
              'date': m['date']?.toString() ?? '',
              'mode': m['mode'] ?? 'Espأ¨ces',
              'type': 'revenue',
            };
          }),
        );

        final recentExpenses = List<Map<String, dynamic>>.from(
          (transactions['recentExpenses'] as List? ?? []).map((e) {
            final m = Map<String, dynamic>.from(e as Map);
            return {
              'id': m['id'],
              'reference': m['reference'] ?? 'DEP-${m['id'] ?? ''}',
              'title': m['description'] ?? m['category'] ?? 'Dأ©pense',
              'amount': (m['amount'] as num?)?.toDouble() ?? 0.0,
              'date': m['date']?.toString() ?? '',
              'category': m['category'] ?? 'Gأ©nأ©ral',
              'paymentMode': 'Espأ¨ces',
              'type': 'expense',
            };
          }),
        );

        debugPrint("âœ… UnifiedFinancialReport: Successfully loaded directly from Web API!");
        return {
          'success': true,
          'period': period,
          'selectedDate': date.toIso8601String(),
          'totalCollected': (summary['totalRevenueCollected'] as num?)?.toDouble() ?? 0.0,
          'totalExpenses': (summary['totalExpensesSpent'] as num?)?.toDouble() ?? 0.0,
          'netBalance': (summary['netCashFlow'] as num?)?.toDouble() ?? 0.0,
          'totalDebts': (summary['totalRemainingDebts'] as num?)?.toDouble() ?? 0.0,
          'totalExpected': (summary['totalExpectedGlobal'] as num?)?.toDouble() ?? 0.0,
          'expenseRatio': (summary['expenseRatio'] as num?)?.toInt() ?? 0,
          'expensesByCategory': expensesByCategory,
          'paymentsByMode': paymentsByMode,
          'recentPayments': recentPayments,
          'recentExpenses': recentExpenses,
        };
      }
    } catch (remoteErr) {
      debugPrint("â„¹ï¸ڈ Web API unified-report fetch note: $remoteErr. Falling back to local offline calculations.");
    }

    DateTime startDate;
    DateTime endDate;

    if (period == "daily") {
      startDate = DateTime(date.year, date.month, date.day, 0, 0, 0);
      endDate = DateTime(date.year, date.month, date.day, 23, 59, 59);
    } else if (period == "monthly") {
      startDate = DateTime(date.year, date.month, 1, 0, 0, 0);
      endDate = DateTime(date.year, date.month + 1, 0, 23, 59, 59);
    } else if (period == "yearly") {
      startDate = DateTime(date.year, 1, 1, 0, 0, 0);
      endDate = DateTime(date.year, 12, 31, 23, 59, 59);
    } else {
      startDate = DateTime(2000, 1, 1);
      endDate = DateTime(2100, 12, 31);
    }

    try {
      // 1. Rأ©cupأ©ration des Recettes (Paiements d'أ©lأ¨ves)
      double totalCollected = 0.0;
      List<Map<String, dynamic>> recentPayments = [];
      Map<String, double> paymentsByMode = {};

      final feesBox = Hive.isBoxOpen(OfflineStoreManager.boxStudentFees)
          ? Hive.box(OfflineStoreManager.boxStudentFees)
          : await Hive.openBox(OfflineStoreManager.boxStudentFees);

      double totalExpectedGlobal = 0.0;
      double totalDebtsGlobal = 0.0;

      final isLevelSpecific = level != null && !EducationalLevelHelper.hasAllEducationalLevels(level);

      final Set<int> seenFeeIds = {};

      for (var key in feesBox.keys) {
        final keyStr = key.toString();
        // Ne traiter que les donnأ©es appartenant أ  l'أ©cole active
        if (!keyStr.startsWith('student_fees_${schoolId}_') && keyStr.startsWith('student_fees_')) {
          continue;
        }
        final val = feesBox.get(key);
        if (val is List) {
          for (var item in val) {
            if (item is Map) {
              final fee = Map<String, dynamic>.from(item);
              final feeId = (fee['id'] as num?)?.toInt();
              if (feeId != null) {
                if (seenFeeIds.contains(feeId)) continue;
                seenFeeIds.add(feeId);
              }
              final itemSchoolId = (fee['school_id'] as num?)?.toInt() ?? (fee['schoolId'] as num?)?.toInt();
              if (itemSchoolId != null && itemSchoolId != schoolId) {
                continue;
              }

              // Educational level filtering
              final studentLevel = fee['students']?['educational_level'] ??
                  fee['students']?['educationalLevel'] ??
                  fee['students']?['niveau'] ??
                  fee['educational_level'] ??
                  fee['educationalLevel'];
              final studentClass = fee['students']?['classe'] ?? fee['classe'] ?? '';
              final studentSection = fee['students']?['section'] ?? fee['section'];
              final studentFiliere = fee['students']?['filiere'] ?? fee['filiere'];

              if (isLevelSpecific) {
                final isInLevel = EducationalLevelHelper.isStudentInEducationalLevel(
                  educationalLevel: studentLevel?.toString(),
                  className: studentClass.toString(),
                  sectionName: studentSection?.toString(),
                  filiere: studentFiliere?.toString(),
                  activeLevel: level,
                );
                if (!isInLevel) continue;
              }

              totalExpectedGlobal += (fee['total_expected'] as num?)?.toDouble() ?? 0.0;
              totalDebtsGlobal += (fee['balance'] as num?)?.toDouble() ?? 0.0;

              // Check payments list if attached
              final payments = fee['payments'];
              if (payments is List) {
                for (var p in payments) {
                  if (p is Map) {
                    final pDateStr = p['date_paid']?.toString();
                    if (pDateStr != null) {
                      final pDate = DateTime.tryParse(pDateStr);
                      if (pDate != null &&
                          !pDate.isBefore(startDate) &&
                          !pDate.isAfter(endDate)) {
                        final amt = (p['amount'] as num?)?.toDouble() ?? 0.0;
                        final mode = p['payment_mode']?.toString() ?? 'Espأ¨ces';
                        totalCollected += amt;
                        paymentsByMode[mode] = (paymentsByMode[mode] ?? 0.0) + amt;

                        final studentName = fee['students']?['nom_etudiant'] ??
                            fee['students']?['name'] ??
                            fee['student_name'] ??
                            'أ‰lأ¨ve';
                        final className = fee['students']?['classe'] ??
                            fee['classe'] ??
                            '-';

                        recentPayments.add({
                          'id': p['id'],
                          'title': studentName,
                          'studentName': studentName,
                          'classe': className,
                          'educational_level': studentLevel,
                          'reference': p['reference'] ?? 'REC-${p['id'] ?? ''}',
                          'amount': amt,
                          'date': pDateStr,
                          'mode': mode,
                          'type': 'revenue',
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 1.B. Complأ©ter les Recettes avec le Journal Local (fee_payments_cache) si la liste locale أ©tait vide
      if (recentPayments.isEmpty) {
        try {
          final cacheManager = locator<OfflineStoreManager>();
          final journalList = cacheManager.getDataList(
            boxName: OfflineStoreManager.boxFeePayments,
            key: _journalCacheKey(schoolId, null),
          );
          final altJournal = journalList.isEmpty
              ? cacheManager.getDataList(
                  boxName: OfflineStoreManager.boxFeePayments,
                  key: "payments_journal_${schoolId}_all",
                )
              : journalList;

          final Set<dynamic> seenPayIds = recentPayments.map((p) => p['id']).toSet();
          for (final jp in altJournal) {
            final pDateStr = jp['date_paid']?.toString();
            final pDate = pDateStr != null ? DateTime.tryParse(pDateStr) : null;
            if (pDate != null && !pDate.isBefore(startDate) && !pDate.isAfter(endDate)) {
              final pId = jp['id'];
              if (pId != null && seenPayIds.contains(pId)) continue;
              if (pId != null) seenPayIds.add(pId);

              final amt = (jp['amount'] as num?)?.toDouble() ?? 0.0;
              final mode = jp['payment_mode']?.toString() ?? 'Espأ¨ces';
              totalCollected += amt;
              paymentsByMode[mode] = (paymentsByMode[mode] ?? 0.0) + amt;

              final studentName = jp['student_name'] ?? jp['nom_etudiant'] ?? 'أ‰lأ¨ve';
              final className = jp['classe'] ?? '-';
              final pLevel = jp['educational_level'];

              if (isLevelSpecific) {
                final inLvl = EducationalLevelHelper.isStudentInEducationalLevel(
                  educationalLevel: pLevel?.toString(),
                  className: className.toString(),
                  activeLevel: level,
                );
                if (!inLvl) continue;
              }

              recentPayments.add({
                'id': pId,
                'title': studentName,
                'studentName': studentName,
                'classe': className,
                'educational_level': pLevel,
                'reference': jp['reference'] ?? 'REC-${pId ?? ''}',
                'amount': amt,
                'date': pDateStr,
                'mode': mode,
                'type': 'revenue',
              });
            }
          }
        } catch (jErr) {
          debugPrint("Local journal payments fallback: $jErr");
        }
      }

      // 1.C. Complأ©ter en ligne depuis l'API Web des paiements si disponible
      try {
        final startIso = startDate.toIso8601String();
        final endIso = endDate.toIso8601String();
        final remotePayRes = await _apiClient.getJson(
          '/api/mobile/finance/payments?action=getPaymentsJournal&schoolId=$schoolId',
        );
        if (remotePayRes['success'] == true && remotePayRes['data'] is List) {
          final serverPayments = List<Map<String, dynamic>>.from(
            (remotePayRes['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );

          if (serverPayments.isNotEmpty && recentPayments.isEmpty) {
            final Set<dynamic> seenPayIds = {};
            for (final sp in serverPayments) {
              final pDateStr = sp['date_paid']?.toString();
              final pDate = pDateStr != null ? DateTime.tryParse(pDateStr) : null;
              if (pDate != null && !pDate.isBefore(startDate) && !pDate.isAfter(endDate)) {
                final pId = sp['id'];
                if (pId != null && seenPayIds.contains(pId)) continue;
                if (pId != null) seenPayIds.add(pId);

                final amt = (sp['amount'] as num?)?.toDouble() ?? 0.0;
                final mode = sp['payment_mode']?.toString() ?? 'Espأ¨ces';
                totalCollected += amt;
                paymentsByMode[mode] = (paymentsByMode[mode] ?? 0.0) + amt;

                final studentName = sp['student_name'] ?? sp['nom_etudiant'] ?? 'أ‰lأ¨ve';
                final className = sp['classe'] ?? '-';
                final pLevel = sp['educational_level'];

                if (isLevelSpecific) {
                  final inLvl = EducationalLevelHelper.isStudentInEducationalLevel(
                    educationalLevel: pLevel?.toString(),
                    className: className.toString(),
                    activeLevel: level,
                  );
                  if (!inLvl) continue;
                }

                recentPayments.add({
                  'id': pId,
                  'title': studentName,
                  'studentName': studentName,
                  'classe': className,
                  'educational_level': pLevel,
                  'reference': sp['reference'] ?? 'REC-${pId ?? ''}',
                  'amount': amt,
                  'date': pDateStr,
                  'mode': mode,
                  'type': 'revenue',
                });
              }
            }
          }
        }
      } catch (payApiErr) {
        debugPrint("API Web payments journal fetch note: $payApiErr");
      }

      // 2. Rأ©cupأ©ration des Dأ©penses (Expenses)
      // On combine les dأ©penses du serveur Web (en ligne) avec le cache local/dأ©penses hors-ligne
      double totalExpenses = 0.0;
      List<Map<String, dynamic>> recentExpenses = [];
      Map<String, double> expensesByCategory = {};
      final Set<dynamic> processedExpenseIds = {};

      // 2.A. Tenter d'abord de rأ©cupأ©rer les dأ©penses depuis l'API Web / Serveur
      try {
        final startIso = startDate.toIso8601String();
        final endIso = endDate.toIso8601String();
        final remoteRes = await _apiClient.getJson(
          '/api/mobile/finance/expenses?schoolId=$schoolId&startDate=$startIso&endDate=$endIso',
        );

        if (remoteRes['success'] == true && remoteRes['data'] is List) {
          final serverList = List<Map<String, dynamic>>.from(
            (remoteRes['data'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );

          for (final exp in serverList) {
            final expId = exp['id'];
            if (expId != null) processedExpenseIds.add(expId);

            final amt = (exp['amount'] as num?)?.toDouble() ?? 0.0;
            final cat = exp['category']?.toString() ?? 'Gأ©nأ©ral';
            final eDateStr = exp['date_expense']?.toString() ?? '';

            totalExpenses += amt;
            expensesByCategory[cat] = (expensesByCategory[cat] ?? 0.0) + amt;
            recentExpenses.add({
              'id': expId,
              'reference': exp['reference'],
              'title': exp['description'] ?? cat,
              'amount': amt,
              'date': eDateStr,
              'category': cat,
              'paymentMode': exp['payment_mode'] ?? 'Espأ¨ces',
              'type': 'expense',
            });
          }
        }
      } catch (e) {
        debugPrint("Note: API Web expenses fetch: $e. Fallback to Supabase & local cache.");
        // Fallback Supabase si l'API REST est indisponible
        try {
          dynamic expRes;
          try {
            expRes = await _client
                .from('expenses')
                .select('id, reference, amount, date_expense, description, category_id, payment_mode, expense_categories(name)')
                .or('school_id.eq.$schoolId,school_id.is.null')
                .gte('date_expense', startDate.toIso8601String())
                .lte('date_expense', endDate.toIso8601String())
                .order('date_expense', ascending: false);
          } catch (_) {
            // Requأھte simplifiأ©e sans jointure si le schأ©ma relationnel de foreign key أ©choue
            expRes = await _client
                .from('expenses')
                .select('id, reference, amount, date_expense, description, category_id, payment_mode')
                .or('school_id.eq.$schoolId,school_id.is.null')
                .gte('date_expense', startDate.toIso8601String())
                .lte('date_expense', endDate.toIso8601String())
                .order('date_expense', ascending: false);
          }

          if (expRes is List) {
            for (var er in expRes) {
              final expId = er['id'];
              if (expId != null) processedExpenseIds.add(expId);

              final amt = (er['amount'] as num?)?.toDouble() ?? 0.0;
              final catObj = er['expense_categories'] as Map<String, dynamic>?;
              final cat = catObj?['name'] ?? er['category'] ?? 'Gأ©nأ©ral';
              final eDateStr = er['date_expense']?.toString() ?? '';

              totalExpenses += amt;
              expensesByCategory[cat] = (expensesByCategory[cat] ?? 0.0) + amt;
              recentExpenses.add({
                'id': expId,
                'reference': er['reference'],
                'title': er['description'] ?? cat,
                'amount': amt,
                'date': eDateStr,
                'category': cat,
                'paymentMode': er['payment_mode'] ?? 'Espأ¨ces',
                'type': 'expense',
              });
            }
          }
        } catch (supaErr) {
          debugPrint("Supabase direct query expenses fallback error: $supaErr");
        }
      }

      // 2.B. Fusionner avec le cache local Hive (notamment dأ©penses crأ©أ©es hors-ligne et dأ©penses synchronisأ©es)
      final syncBox = Hive.isBoxOpen(OfflineStoreManager.boxAcademicPeriods)
          ? Hive.box(OfflineStoreManager.boxAcademicPeriods)
          : await Hive.openBox(OfflineStoreManager.boxAcademicPeriods);

      final cachedExpenses = syncBox.get("offline_expenses_$schoolId");
      if (cachedExpenses is List) {
        for (var item in cachedExpenses) {
          if (item is Map) {
            final exp = Map<String, dynamic>.from(item);
            final expId = exp['id'];
            if (expId != null && processedExpenseIds.contains(expId)) {
              continue; // Dأ©jأ  pris en compte depuis le serveur
            }

            final eDateStr = exp['date_expense']?.toString();
            final eDate = eDateStr != null ? DateTime.tryParse(eDateStr) : null;
            if (eDate != null && !eDate.isBefore(startDate) && !eDate.isAfter(endDate)) {
              if (expId != null) processedExpenseIds.add(expId);
              final amt = (exp['amount'] as num?)?.toDouble() ?? 0.0;
              final cat = exp['category']?.toString() ?? 'Gأ©nأ©ral';
              totalExpenses += amt;
              expensesByCategory[cat] = (expensesByCategory[cat] ?? 0.0) + amt;
              recentExpenses.insert(0, {
                'id': expId,
                'reference': exp['reference'],
                'title': exp['description'] ?? cat,
                'amount': amt,
                'date': eDateStr,
                'category': cat,
                'paymentMode': exp['payment_mode'] ?? 'Espأ¨ces',
                'type': 'expense',
              });
            }
          }
        }
      }

      final netBalance = totalCollected - totalExpenses;
      final expenseRatio = totalCollected > 0
          ? ((totalExpenses / totalCollected) * 100).round()
          : 0;

      return {
        'success': true,
        'period': period,
        'selectedDate': date.toIso8601String(),
        'totalCollected': totalCollected,
        'totalExpenses': totalExpenses,
        'netBalance': netBalance,
        'totalDebts': totalDebtsGlobal,
        'totalExpected': totalExpectedGlobal,
        'expenseRatio': expenseRatio,
        'expensesByCategory': expensesByCategory,
        'paymentsByMode': paymentsByMode,
        'recentPayments': recentPayments,
        'recentExpenses': recentExpenses,
      };
    } catch (e) {
      debugPrint("Error in getUnifiedFinancialReport: $e");
      return {
        'success': false,
        'error': e.toString(),
        'totalCollected': 0.0,
        'totalExpenses': 0.0,
        'netBalance': 0.0,
        'totalDebts': 0.0,
      };
    }
  }

  /// Enregistrer une dأ©pense avec synchronisation immأ©diate (si en ligne) ou file d'attente (si hors-ligne)
  Future<Map<String, dynamic>> recordExpenseOffline({
    required int schoolId,
    required String description,
    required double amount,
    required String category,
    required String paymentMode,
  }) async {
    try {
      final syncEngine = locator<SyncEngine>();
      final isOnline = syncEngine.isOnlineNotifier.value;

      final syncBox = Hive.isBoxOpen(OfflineStoreManager.boxAcademicPeriods)
          ? Hive.box(OfflineStoreManager.boxAcademicPeriods)
          : await Hive.openBox(OfflineStoreManager.boxAcademicPeriods);

      final expKey = "offline_expenses_$schoolId";
      final currentList = List<Map<String, dynamic>>.from(
        (syncBox.get(expKey) as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? []
      );

      final tempId = -DateTime.now().millisecondsSinceEpoch;
      final newExp = {
        'id': tempId,
        'school_id': schoolId,
        'description': description,
        'amount': amount,
        'category': category,
        'payment_mode': paymentMode,
        'date_expense': DateTime.now().toIso8601String(),
        'status': 'Payأ©',
      };

      // Si le mobile est actuellement en ligne, tenter la transmission directe au serveur
      if (isOnline) {
        try {
          final res = await _apiClient.postJson('/api/mobile/sync', {
            'table': 'expenses',
            'action': 'insert',
            'data': newExp,
            'id': 'exp_$tempId',
          });

          if (res['success'] == true) {
            final results = res['results'] as List?;
            final firstData = results != null && results.isNotEmpty && results.first is Map
                ? (results.first['data'] as Map<String, dynamic>?)
                : null;
            if (firstData != null && firstData['id'] != null) {
              newExp['id'] = firstData['id'];
              newExp['reference'] = firstData['reference'];
            }
            currentList.insert(0, newExp);
            await syncBox.put(expKey, currentList);
            debugPrint("âœ… Dأ©pense synchronisأ©e immأ©diatement avec succأ¨s sur le serveur Web !");
            return {'success': true, 'data': newExp, 'isOnline': true};
          }
        } catch (netErr) {
          debugPrint("â„¹ï¸ڈ Transmission directe أ©chouأ©e ($netErr), mise en file d'attente locale...");
        }
      }

      // Si hors-ligne ou si la requأھte directe a أ©chouأ©, sauvegarder en local et mettre en file d'attente
      currentList.insert(0, newExp);
      await syncBox.put(expKey, currentList);

      final queueManager = getIt<OfflineQueueManager>();
      await queueManager.enqueue(
        table: "expenses",
        action: "insert",
        data: newExp,
        priority: 2,
      );

      return {'success': true, 'data': newExp, 'isOnline': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}

