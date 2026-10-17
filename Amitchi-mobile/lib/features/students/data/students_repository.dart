import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/api/supabase_client.dart';
import '../../../core/auth/session_manager.dart';
import '../../../core/di/injection.dart';
import '../../../core/api/mobile_api_client.dart';
import '../../../core/api/offline_store_manager.dart';
import '../../../core/api/offline_queue_manager.dart';
import '../../../core/api/sync_engine.dart';

class StudentsRepository {
  final MobileApiClient _apiClient;
  final SupabaseClient _client;

  StudentsRepository({MobileApiClient? apiClient, SupabaseClient? client})
      : _apiClient = apiClient ?? MobileApiClient(),
        _client = client ?? SupabaseClientManager().client;

  static const String _studentsCacheKey = "students_list";

  Future<List<Map<String, dynamic>>> getStudentsList() async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("📶 Offline Mode: Fetching students list from local cache.");
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
    }

    try {
      final response = await _apiClient.getJson('/api/mobile/students');
      final list = List<Map<String, dynamic>>.from(response['data'] ?? []);
      
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
        data: list,
      );
      
      return list;
    } catch (e) {
      debugPrint('Error fetching students list: $e');
      return cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
    }
  }

  Future<Map<String, dynamic>?> getStudentDetails(int studentId) async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    final cacheKey = "student_detail_$studentId";

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("📶 Offline Mode: Fetching student details from local cache.");
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: cacheKey,
      );
      if (cached.isNotEmpty) {
        return cached.first;
      }
      
      // Fallback search in cached students list
      final allStudents = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
      try {
        final match = allStudents.firstWhere((s) => (s['id'] as num?)?.toInt() == studentId);
        return match;
      } catch (_) {}
      return null;
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/students/$studentId',
      );
      final details = Map<String, dynamic>.from(response['data'] ?? {});
      if (details.isNotEmpty) {
        await cacheManager.saveDataList(
          boxName: OfflineStoreManager.boxStudents,
          key: cacheKey,
          data: [details],
        );
      }
      return details;
    } catch (e) {
      debugPrint('Error fetching student details: $e');
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: cacheKey,
      );
      if (cached.isNotEmpty) return cached.first;
      return null;
    }
  }

  Future<Map<String, dynamic>> getStudentFormOptions() async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();
    const cacheKey = "student_form_options";

    if (!syncEngine.isOnlineNotifier.value) {
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: cacheKey,
      );
      if (cached.isNotEmpty && cached.first.containsKey('levels')) {
        final item = cached.first;
        return {
          'levels': List<String>.from(item['levels'] ?? []),
          'sections': List<String>.from(item['sections'] ?? []),
          'classes': List<String>.from(item['classes'] ?? []),
          'sessions': List<String>.from(item['sessions'] ?? ['2026-2027']),
          'classesDetails': List<Map<String, dynamic>>.from(
            (item['classesDetails'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
          ),
        };
      }
      return _buildFallbackFormOptions();
    }

    try {
      final response = await _apiClient.getJson(
        '/api/mobile/students/0/summary?action=getStudentFormOptions',
      );

      final levels = List<String>.from(response['levels'] ?? []);
      final sections = List<String>.from(response['sections'] ?? []);
      final classes = List<String>.from(response['classes'] ?? []);
      final sessions = List<String>.from(response['sessions'] ?? ['2026-2027']);
      final classesDetails = List<Map<String, dynamic>>.from(
        (response['classesDetails'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
      );

      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: cacheKey,
        data: [
          {
            'levels': levels,
            'sections': sections,
            'classes': classes,
            'sessions': sessions,
            'classesDetails': classesDetails,
          }
        ],
      );

      return {
        'levels': levels,
        'sections': sections,
        'classes': classes,
        'sessions': sessions,
        'classesDetails': classesDetails,
      };
    } catch (e) {
      debugPrint('Error fetching student form options: $e');
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: cacheKey,
      );
      if (cached.isNotEmpty && cached.first.containsKey('levels')) {
        final item = cached.first;
        return {
          'levels': List<String>.from(item['levels'] ?? []),
          'sections': List<String>.from(item['sections'] ?? []),
          'classes': List<String>.from(item['classes'] ?? []),
          'sessions': List<String>.from(item['sessions'] ?? ['2026-2027']),
          'classesDetails': List<Map<String, dynamic>>.from(
            (item['classesDetails'] as List? ?? []).map((x) => Map<String, dynamic>.from(x)),
          ),
        };
      }
      return _buildFallbackFormOptions();
    }
  }

  /// Derives real options from local Hive caches if direct form options cache is missing
  Map<String, dynamic> _buildFallbackFormOptions() {
    final cacheManager = locator<OfflineStoreManager>();
    final Set<String> levels = {};
    final Set<String> sections = {};
    final Set<String> classes = {};
    final Set<String> sessions = {};
    final List<Map<String, dynamic>> classesDetails = [];

    // 1. Try from cached classes & subjects (OfflineStoreManager.boxClassSubjects)
    try {
      if (Hive.isBoxOpen(OfflineStoreManager.boxClassSubjects)) {
        final box = Hive.box(OfflineStoreManager.boxClassSubjects);
        for (final key in box.keys) {
          final raw = box.get(key);
          if (raw is List) {
            for (final elem in raw) {
              if (elem is Map) {
                final item = Map<String, dynamic>.from(elem);
                final cName = item['class_name'] ?? item['className'] ?? item['name'];
                final sName = item['section_name'] ?? item['sectionName'];
                final lName = item['educational_level'] ?? item['educationalLevel'] ?? item['level'];
                if (cName != null && cName.toString().trim().isNotEmpty) {
                  final cStr = cName.toString().trim();
                  classes.add(cStr);
                  classesDetails.add({
                    'id': item['id'],
                    'className': cStr,
                    'sectionName': sName?.toString() ?? '',
                    'educationalLevel': lName?.toString() ?? '',
                    'scolariteMensuelle': item['scolarite_mensuelle'] ?? item['scolariteMensuelle'] ?? 0,
                    'droitsInscription': item['droits_inscription'] ?? item['droitsInscription'] ?? 0,
                    'cogesCarteId': item['coges_carte_id'] ?? item['cogesCarteId'] ?? 0,
                    'transportInternat': item['transport_internat'] ?? item['transportInternat'] ?? 0,
                    'ancienSolde': item['ancien_solde'] ?? item['ancienSolde'] ?? 0,
                    'statutInitial': item['statut_initial'] ?? item['statutInitial'] ?? 'Actif',
                  });
                }
                if (sName != null && sName.toString().trim().isNotEmpty) {
                  sections.add(sName.toString().trim());
                }
                if (lName != null && lName.toString().trim().isNotEmpty) {
                  levels.add(lName.toString().trim());
                }
              }
            }
          }
        }
      }
    } catch (_) {}

    // 2. Try from cached students list (OfflineStoreManager.boxStudents)
    try {
      final cachedStudents = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
      for (final s in cachedStudents) {
        final cName = s['classe']?.toString().trim();
        final sName = s['section']?.toString().trim();
        final lName = s['educational_level']?.toString().trim();
        final sess = s['session']?.toString().trim();
        if (cName != null && cName.isNotEmpty) classes.add(cName);
        if (sName != null && sName.isNotEmpty) sections.add(sName);
        if (lName != null && lName.isNotEmpty) levels.add(lName);
        if (sess != null && sess.isNotEmpty) sessions.add(sess);
      }
    } catch (_) {}

    // 3. Try from cached sessions (OfflineStoreManager.boxSchoolSessions)
    try {
      if (Hive.isBoxOpen(OfflineStoreManager.boxSchoolSessions)) {
        final box = Hive.box(OfflineStoreManager.boxSchoolSessions);
        for (final key in box.keys) {
          final raw = box.get(key);
          if (raw is List) {
            for (final elem in raw) {
              if (elem is Map) {
                final item = Map<String, dynamic>.from(elem);
                final sessName = item['session_name'] ?? item['name'] ?? item['session'];
                if (sessName != null && sessName.toString().trim().isNotEmpty) {
                  sessions.add(sessName.toString().trim());
                }
              }
            }
          }
        }
      }
    } catch (_) {}

    final finalLevels = levels.isNotEmpty ? (levels.toList()..sort()) : ['Primaire', 'Collège', 'Lycée'];
    final finalSections = sections.isNotEmpty ? (sections.toList()..sort()) : ['Générale'];
    final finalClasses = classes.isNotEmpty ? (classes.toList()..sort()) : ['6ème A', '5ème A', '4ème A', '3ème A', '2nde A', '1ère A', 'Tle A'];
    final finalSessions = sessions.isNotEmpty ? sessions.toList() : ['2026-2027'];

    return {
      'levels': finalLevels,
      'sections': finalSections,
      'classes': finalClasses,
      'sessions': finalSessions,
      'classesDetails': classesDetails,
    };
  }

  Future<Map<String, dynamic>> saveStudent({
    int? studentId,
    required Map<String, dynamic> payload,
  }) async {
    final syncEngine = locator<SyncEngine>();
    final isOnline = syncEngine.isOnlineNotifier.value;
    final queueManager = locator<OfflineQueueManager>();
    final cacheManager = locator<OfflineStoreManager>();

    final dataToSend = Map<String, dynamic>.from(payload);
    if (studentId != null) {
      dataToSend['id'] = studentId;
    }

    if (!isOnline) {
      final localTempId = "temp_std_${DateTime.now().millisecondsSinceEpoch}";
      dataToSend['localId'] = localTempId;
      dataToSend['id'] = localTempId;

      await queueManager.enqueue(
        table: 'students',
        action: 'create_student',
        data: dataToSend,
        priority: 1,
      );

      // Optimistic update in Hive students list
      final currentList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
      currentList.insert(0, dataToSend);
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
        data: currentList,
      );

      // Optimistically insert into Gestion Financière cache
      await _createOptimisticFeeForStudent(dataToSend, localTempId);

      return {
        'success': true,
        'isOffline': true,
        'localId': localTempId,
        'message': 'Élève enregistré localement en mode hors-ligne.',
      };
    }

    try {
      final response = await _apiClient.postJson(
        '/api/mobile/students',
        {
          'action': 'saveStudent',
          'payload': dataToSend,
        },
      );
      return response;
    } catch (e) {
      debugPrint('Error saving student online, falling back to offline queue: $e');
      final localTempId = "temp_std_${DateTime.now().millisecondsSinceEpoch}";
      dataToSend['localId'] = localTempId;
      dataToSend['id'] = localTempId;

      await queueManager.enqueue(
        table: 'students',
        action: 'create_student',
        data: dataToSend,
        priority: 1,
      );

      // Optimistic update in Hive students list
      final currentList = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
      );
      currentList.insert(0, dataToSend);
      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _studentsCacheKey,
        data: currentList,
      );

      // Optimistically insert into Gestion Financière cache
      await _createOptimisticFeeForStudent(dataToSend, localTempId);

      return {
        'success': true,
        'isOffline': true,
        'localId': localTempId,
        'message': 'Connexion instable. Élève mis en file d\'attente de synchronisation.',
      };
    }
  }

  Future<void> _createOptimisticFeeForStudent(Map<String, dynamic> studentData, dynamic studentId) async {
    try {
      if (!Hive.isBoxOpen(OfflineStoreManager.boxStudentFees)) {
        await Hive.openBox(OfflineStoreManager.boxStudentFees);
      }
      final box = Hive.box(OfflineStoreManager.boxStudentFees);

      final monthly = (studentData['frais_mensuels'] as num?)?.toDouble() ??
          double.tryParse(studentData['frais_mensuels']?.toString() ?? '') ?? 0.0;
      final registration = (studentData['frais_inscription'] as num?)?.toDouble() ??
          double.tryParse(studentData['frais_inscription']?.toString() ?? '') ?? 0.0;
      final coges = (studentData['frais_coges_card'] as num?)?.toDouble() ??
          double.tryParse(studentData['frais_coges_card']?.toString() ?? '') ?? 1500.0;
      final transport = (studentData['frais_transport_internat'] as num?)?.toDouble() ??
          double.tryParse(studentData['frais_transport_internat']?.toString() ?? '') ?? 0.0;
      final prevBalance = (studentData['ancien_solde'] as num?)?.toDouble() ??
          double.tryParse(studentData['ancien_solde']?.toString() ?? '') ?? 0.0;

      final isPrimary = (studentData['educational_level']?.toString().toLowerCase().contains('prim') ?? false) ||
          (studentData['educational_level']?.toString().toLowerCase().contains('mater') ?? false) ||
          (studentData['classe']?.toString().toUpperCase().contains('CE') ?? false) ||
          (studentData['classe']?.toString().toUpperCase().contains('CM') ?? false) ||
          (studentData['classe']?.toString().toUpperCase().contains('CI') ?? false) ||
          (studentData['classe']?.toString().toUpperCase().contains('CP') ?? false);

      double tuition;
      if (monthly >= 30000.0 || (isPrimary && monthly >= 20000.0)) {
        // The entered amount is already the full annual tuition, NOT monthly
        tuition = monthly;
      } else if (monthly > 0) {
        tuition = monthly * 9.0;
      } else {
        tuition = isPrimary ? 40000.0 : 0.0;
      }

      double totalExpected = tuition + registration + coges + transport + prevBalance;
      if (isPrimary && (totalExpected > 75000.0 || totalExpected <= 0.0)) {
        // Enforce realistic school fee ceiling for primary level
        totalExpected = 45000.0;
      }
      final feeId = DateTime.now().millisecondsSinceEpoch;

      final session = locator<SessionManager>();
      final sessionSchoolIdStr = await session.getSchoolId();
      final effectiveSchoolId = (sessionSchoolIdStr != null && int.tryParse(sessionSchoolIdStr) != null)
          ? int.parse(sessionSchoolIdStr)
          : (studentData['school_id'] as int? ?? 1);

      final feeRecord = <String, dynamic>{
        'id': feeId,
        'student_id': studentId,
        'school_id': effectiveSchoolId,
        'session_id': 16,
        'total_expected': totalExpected > 0 ? totalExpected : 45000.0,
        'total_paid': 0.0,
        'total_reduction': 0.0,
        'balance': totalExpected > 0 ? totalExpected : 45000.0,
        'status': 'Impayé',
        'is_offline_draft': true,
        'students': {
          'id': studentId,
          'nom_etudiant': studentData['nom_etudiant'] ?? 'Nouvel Élève',
          'num_admission': studentData['num_admission'] ?? 'AM-2026-TEMP',
          'classe': studentData['classe'] ?? '',
          'educational_level': studentData['educational_level'] ?? '',
          'section': studentData['section'] ?? '',
          'mobile': studentData['mobile'] ?? '',
          'nom_pere': studentData['nom_pere'] ?? '',
        },
      };

      // Find all student_fees keys in boxStudentFees and prepend new student fee
      final feeKeys = box.keys.map((k) => k.toString()).where((k) => k.startsWith('student_fees_')).toList();
      if (feeKeys.isEmpty) {
        feeKeys.add('student_fees_1_16');
        feeKeys.add('student_fees_1_1');
      }

      for (final key in feeKeys) {
        final existingRaw = box.get(key);
        final list = (existingRaw is List)
            ? existingRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList()
            : <Map<String, dynamic>>[];
        list.insert(0, feeRecord);
        await box.put(key, list);

        // Update corresponding stats key
        final statsKey = key.replaceFirst('student_fees_', 'finance_stats_');
        final currentStatsList = box.get(statsKey);
        if (currentStatsList is List && currentStatsList.isNotEmpty && currentStatsList.first is Map) {
          final statsMap = Map<String, dynamic>.from(currentStatsList.first as Map);
          final innerStats = statsMap['stats'] is Map ? Map<String, dynamic>.from(statsMap['stats'] as Map) : <String, dynamic>{};
          innerStats['totalExpected'] = ((innerStats['totalExpected'] as num?)?.toDouble() ?? 0.0) + (feeRecord['total_expected'] as double);
          innerStats['totalDebts'] = ((innerStats['totalDebts'] as num?)?.toDouble() ?? 0.0) + (feeRecord['balance'] as double);
          statsMap['stats'] = innerStats;
          await box.put(statsKey, [statsMap]);
        }
      }
      debugPrint("✅ Optimistic fee generated and cached for student $studentId across keys: $feeKeys");
    } catch (e) {
      debugPrint("⚠️ Warning generating optimistic student fee: $e");
    }
  }

  Future<Map<String, dynamic>> getPromotionOptions() async {
    try {
      final response = await _apiClient.getJson(
        '/api/mobile/students/0/summary?action=getPromotionOptions',
      );
      final classes = List<Map<String, dynamic>>.from(response['classes'] ?? []);
      final sessions = List<Map<String, dynamic>>.from(response['sessions'] ?? []);

      return {
        'classes': classes,
        'sessions': sessions,
      };
    } catch (e) {
      debugPrint('Error fetching promotion options: $e');
      return {
        'classes': <Map<String, dynamic>>[],
        'sessions': <Map<String, dynamic>>[],
      };
    }
  }

  Future<List<Map<String, dynamic>>> getPromotionHistory({
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.getJson(
        '/api/mobile/students/0/summary?action=getPromotionHistory&limit=$limit',
      );
      return List<Map<String, dynamic>>.from(response['data'] ?? []);
    } catch (e) {
      debugPrint('Error fetching promotion history: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getPromotionPreview({
    required List<Map<String, dynamic>> students,
    String? targetClass,
    String? targetSession,
  }) async {
    try {
      if (students.isEmpty) return [];

      final studentIds = students
          .map((row) => row['id'])
          .whereType<int>()
          .toList();

      final response = await _apiClient.getJson(
        '/api/mobile/students/0/summary?action=getPromotionPreview&studentIds=${studentIds.join(',')}',
      );

      final previewList = List<Map<String, dynamic>>.from(response['data'] ?? []);
      final statsMap = {
        for (var p in previewList)
          (p['id'] as num).toInt(): p
      };

      return students.map((student) {
        final studentId = student['id'] as int?;
        final stats = statsMap[studentId];
        final average = (stats?['calculated_average'] as num?)?.toDouble();
        final recommendation = stats?['recommendation']?.toString() ?? 'A verifier';

        return {
          ...student,
          'target_class': targetClass,
          'target_session': targetSession,
          'calculated_average': average,
          'recommendation': recommendation,
        };
      }).toList();
    } catch (e) {
      debugPrint('Error fetching promotion preview: $e');
      return students
          .map(
            (student) => {
              ...student,
              'target_class': targetClass,
              'target_session': targetSession,
              'calculated_average': null,
              'recommendation': 'A verifier',
            },
          )
          .toList();
    }
  }

  Future<Map<String, dynamic>> promoteStudents({
    required List<int> studentIds,
    required String targetClass,
    required String targetSession,
    required bool transferBalance,
  }) async {
    try {
      if (studentIds.isEmpty) {
        return {'success': false, 'error': 'Aucun etudiant selectionne.'};
      }

      final response = await _apiClient.postJson(
        '/api/mobile/students',
        {
          'action': 'promoteStudents',
          'payload': {
            'studentIds': studentIds,
            'targetClass': targetClass,
            'targetSession': targetSession,
            'transferBalance': transferBalance,
          },
        },
      );
      return response;
    } catch (e) {
      debugPrint('Error promoting students: $e');
      return {'success': false, 'error': '$e'};
    }
  }
}
