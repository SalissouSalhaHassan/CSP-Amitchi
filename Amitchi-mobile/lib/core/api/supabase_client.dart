import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://ntlncvstzmfqbqystpwi.supabase.co',
  );
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bG5jdnN0em1mcWJxeXN0cHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mzc0MTcsImV4cCI6MjA5MTQxMzQxN30.K5jN6G57H5t-OQf648qWb90sT81kU0e8bO4Pq6zTqP4',
  );
}

class SupabaseClientManager {
  static final SupabaseClientManager _instance = SupabaseClientManager._internal();
  factory SupabaseClientManager() => _instance;
  SupabaseClientManager._internal();

  late final SupabaseClient client;

  Future<void> init() async {
    await Supabase.initialize(
      url: SupabaseConfig.url,
      publishableKey: SupabaseConfig.anonKey,
    );
    client = Supabase.instance.client;
  }
}
