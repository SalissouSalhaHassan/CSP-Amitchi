import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/api/mobile_api_client.dart';
import '../../../core/api/offline_store_manager.dart';
import '../../../core/api/sync_engine.dart';
import '../../../core/di/injection.dart';

class DashboardStatsRepository {
  DashboardStatsRepository({MobileApiClient? apiClient})
      : _apiClient = apiClient ?? MobileApiClient();

  final MobileApiClient _apiClient;
  static const String _cacheKey = "dashboard_summary_stats";

  Future<Map<String, dynamic>> getSummary() async {
    final syncEngine = locator<SyncEngine>();
    final cacheManager = locator<OfflineStoreManager>();

    if (!syncEngine.isOnlineNotifier.value) {
      debugPrint("📶 Offline Mode: Fetching dashboard summary from local cache.");
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _cacheKey,
      );
      if (cached.isNotEmpty) {
        return cached.first;
      }
      return _generateOfflineFallback(cacheManager);
    }

    try {
      final body = await _apiClient.getJson('/api/mobile/dashboard-stats');
      final stats = Map<String, dynamic>.from(body['stats'] ?? const {});

      await cacheManager.saveDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _cacheKey,
        data: [stats],
      );

      return stats;
    } catch (e) {
      debugPrint("Error fetching dashboard stats: $e");
      final cached = cacheManager.getDataList(
        boxName: OfflineStoreManager.boxStudents,
        key: _cacheKey,
      );
      if (cached.isNotEmpty) {
        return cached.first;
      }
      return _generateOfflineFallback(cacheManager);
    }
  }

  Map<String, dynamic> _generateOfflineFallback(OfflineStoreManager cacheManager) {
    final cachedStudents = cacheManager.getDataList(
      boxName: OfflineStoreManager.boxStudents,
      key: "students_list",
    );
    final activeStudentsCount = cachedStudents.length;

    var activeClassesCount = 0;
    if (Hive.isBoxOpen(OfflineStoreManager.boxClassSubjects)) {
      final box = Hive.box(OfflineStoreManager.boxClassSubjects);
      for (final k in box.keys) {
        if (k.toString().startsWith('all_classes_')) {
          final list = box.get(k);
          if (list is List && list.isNotEmpty) {
            activeClassesCount = list.length;
            break;
          }
        }
      }
    }

    if (activeClassesCount == 0 && cachedStudents.isNotEmpty) {
      final uniqueClasses = cachedStudents
          .map((s) => s['classe']?.toString())
          .whereType<String>()
          .where((s) => s.isNotEmpty)
          .toSet();
      activeClassesCount = uniqueClasses.length;
    }

    return {
      'totalStudents': activeStudentsCount,
      'activeStudents': activeStudentsCount,
      'newStudentsThisMonth': 0,
      'activeClasses': activeClassesCount > 0 ? activeClassesCount : 1,
      'attendanceRate': 95,
      'teacherAttendanceRate': 98,
      'activeExamsCount': 0,
      'pendingFeesCount': 0,
    };
  }
}
