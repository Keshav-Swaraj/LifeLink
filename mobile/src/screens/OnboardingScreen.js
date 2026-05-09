import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('victim'); // 'victim' or 'responder'
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [medicalRole, setMedicalRole] = useState('Paramedic');
  const [regNo, setRegNo] = useState('');

  async function handleComplete() {
    if (!fullName || !phone) {
      Alert.alert('Required Fields', 'Please enter your full name and phone number.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        full_name: fullName,
        phone,
        role: role === 'responder' ? 'responder' : 'victim',
        is_verified_medical: role === 'responder', // For demo, we auto-verify
        medical_role: role === 'responder' ? medicalRole : null,
        registration_number: role === 'responder' ? regNo : null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      Alert.alert('Save Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete Profile</Text>
      <Text style={styles.subtitle}>Help us provide faster emergency response.</Text>

      {/* Role Selection */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'victim' && styles.roleActive]}
          onPress={() => setRole('victim')}
        >
          <Text style={[styles.roleEmoji, role === 'victim' && styles.textActive]}>🧘</Text>
          <Text style={[styles.roleLabel, role === 'victim' && styles.textActive]}>Regular User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, role === 'responder' && styles.roleActive]}
          onPress={() => setRole('responder')}
        >
          <Text style={[styles.roleEmoji, role === 'responder' && styles.textActive]}>🚑</Text>
          <Text style={[styles.roleLabel, role === 'responder' && styles.textActive]}>Medical Responder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#636366"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor="#636366"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {role === 'responder' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Designation</Text>
              <View style={styles.pickerContainer}>
                {['Doctor', 'Nurse', 'Paramedic'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.miniButton, medicalRole === m && styles.miniActive]}
                    onPress={() => setMedicalRole(m)}
                  >
                    <Text style={[styles.miniText, medicalRole === m && styles.textActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Reg Number</Text>
              <TextInput
                style={styles.input}
                placeholder="REG123456"
                placeholderTextColor="#636366"
                value={regNo}
                onChangeText={setRegNo}
              />
            </View>
          </>
        )}

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Finish Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#0A0A0F',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  roleActive: {
    borderColor: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleLabel: {
    color: '#AEAEB2',
    fontWeight: '600',
    fontSize: 14,
  },
  textActive: {
    color: '#FF2D55',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#E5E5EA',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  miniActive: {
    borderColor: '#FF2D55',
  },
  miniText: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
