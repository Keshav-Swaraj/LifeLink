import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {supabase} from '../lib/supabase';

export default function ResponderProfileScreen() {
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [responsesCount, setResponsesCount] = React.useState<number>(0);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const {data: userResp, error: userErr} = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const userId = userResp.user?.id;
        if (!userId) throw new Error('Not authenticated');

        const {data: profileData, error: profileErr} = await supabase
          .from('profiles')
          .select('id, full_name, role, is_verified, avatar_url, is_available')
          .eq('id', userId)
          .single();
        if (profileErr) throw profileErr;

        const {data: countData, count, error: countErr} = await supabase
          .from('emergencies')
          .select('id', {count: 'exact'})
          .eq('responder_id', userId)
          .eq('status', 'resolved');
        if (countErr) throw countErr;

        if (!mounted) return;
        setProfile(profileData ?? null);
        setResponsesCount(typeof count === 'number' ? count : Array.isArray(countData) ? (countData as unknown[]).length : 0);
      } catch (e) {
        console.warn('Failed to load profile', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleAvailability = React.useCallback(async (value: boolean) => {
    if (!profile?.id) return;
    setUpdating(true);
    try {
      const {error} = await supabase.from('profiles').update({is_available: value}).eq('id', profile.id);
      if (error) throw error;
      setProfile({...profile, is_available: value});
    } catch (e) {
      console.warn('Failed to update availability', e);
    } finally {
      setUpdating(false);
    }
  }, [profile]);

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return <Image source={{uri: profile.avatar_url}} style={styles.avatar} />;
    }

    const initials = (profile?.full_name || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarInitials}>{initials}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          {renderAvatar()}
          <View style={styles.headerText}>
            <Text style={styles.nameText}>{profile?.full_name ?? 'Unknown Responder'}</Text>
            <View style={styles.roleRow}>
              <Text style={styles.roleText}>{profile?.role ?? 'Responder'}</Text>
              {profile?.is_verified ? <Text style={styles.verified}> ✓ Verified</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Responses</Text>
            <Text style={styles.statValue}>{responsesCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Available for Alerts</Text>
            <View style={styles.switchWrap}>
              <Switch
                value={!!profile?.is_available}
                onValueChange={value => void toggleAvailability(value)}
                disabled={updating}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Contact & Credentials</Text>
        <Text style={styles.bodyText}>Role / Specialty: {profile?.role ?? 'N/A'}</Text>
        <Text style={styles.bodyText}>Verified: {profile?.is_verified ? 'Yes' : 'No'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#09090B'},
  content: {padding: 16, gap: 12, paddingBottom: 40},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090B'},
  card: {backgroundColor: '#111113', borderColor: '#27272A', borderWidth: 1, borderRadius: 16, padding: 16},
  headerRow: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  avatar: {width: 84, height: 84, borderRadius: 42},
  avatarPlaceholder: {width: 84, height: 84, borderRadius: 42, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center'},
  avatarInitials: {color: '#F8FAFC', fontSize: 28, fontWeight: '800'},
  headerText: {flex: 1},
  nameText: {color: '#F8FAFC', fontSize: 20, fontWeight: '800'},
  roleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6},
  roleText: {color: '#A1A1AA', fontSize: 14, fontWeight: '700'},
  verified: {color: '#22C55E', marginLeft: 8, fontWeight: '900'},
  statRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 16},
  statItem: {flex: 1, alignItems: 'center'},
  statLabel: {color: '#A1A1AA', fontSize: 12, marginBottom: 6},
  statValue: {color: '#F8FAFC', fontSize: 20, fontWeight: '900'},
  switchWrap: {marginTop: 4},
  sectionLabel: {color: '#F87171', fontSize: 12, fontWeight: '800', marginBottom: 8},
  bodyText: {color: '#E4E4E7', fontSize: 14, marginBottom: 6},
});
