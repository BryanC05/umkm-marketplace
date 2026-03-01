import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';

export default function RegisterScreen({ navigation }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useLanguageStore();
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        businessName: '', businessType: 'none',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const register = useAuthStore((s) => s.register);

    const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleRegister = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.phone.trim()) {
            Alert.alert(t.error, t.fillAllFields);
            return;
        }
        if (!validateEmail(form.email)) {
            Alert.alert(t.error, t.invalidEmailAddress || 'Please enter a valid email address');
            return;
        }
        if (form.password.length < 6) {
            Alert.alert(t.error, t.passwordTooShort);
            return;
        }
        setLoading(true);
        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                phone: form.phone.trim(),
                isSeller: true,
                businessName: form.businessName.trim() || undefined,
                businessType: form.businessType || 'none',
            });
        } catch (err) {
            let errorMessage = t.somethingWentWrong || 'Something went wrong';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            Alert.alert(t.registerFailed, errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const businessTypes = [
        { id: 'micro', label: t.micro },
        { id: 'small', label: t.small },
        { id: 'medium', label: t.medium },
        { id: 'none', label: t.none },
    ];

    const styles = {
        container: { flex: 1 },
        scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
        card: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
        },
        header: { alignItems: 'center', marginBottom: 24 },
        title: { 
            fontSize: 24, 
            fontWeight: '800', 
            color: colors.text, 
            marginBottom: 4,
            letterSpacing: 0.3,
        },
        subtitle: { 
            fontSize: 14, 
            color: colors.textSecondary,
        },
        form: { gap: 14 },
        inputGroup: { gap: 6 },
        label: { 
            fontSize: 11, 
            fontWeight: '600', 
            color: colors.textSecondary,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        inputWrap: {
            flexDirection: 'row', 
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            height: 48,
        },
        inputIcon: { marginRight: 10 },
        input: {
            flex: 1,
            fontSize: 15,
            color: colors.text,
            height: 48,
        },
        passwordBtn: { padding: 4 },
        typeChip: {
            paddingHorizontal: 14, 
            paddingVertical: 8, 
            borderRadius: 20, 
            marginRight: 8,
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', 
            borderWidth: 1, 
            borderColor: colors.border,
        },
        typeChipActive: { 
            backgroundColor: colors.primary, 
            borderColor: colors.primary 
        },
        typeChipText: { fontSize: 13, color: colors.text },
        typeChipTextActive: { color: colors.white },
        button: {
            backgroundColor: colors.primary, 
            borderRadius: 8, 
            height: 48,
            justifyContent: 'center', 
            alignItems: 'center', 
            marginTop: 12,
            shadowColor: colors.primary, 
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, 
            shadowRadius: 8, 
            elevation: 4,
        },
        buttonDisabled: { opacity: 0.7 },
        buttonText: { 
            color: colors.white, 
            fontSize: 15, 
            fontWeight: '700',
            letterSpacing: 0.5,
        },
        linkButton: { alignItems: 'center', marginTop: 20 },
        linkText: { fontSize: 14, color: colors.textSecondary },
        linkBold: { color: colors.primary, fontWeight: '700' },
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f3f5f7' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Daftar</Text>
                        <Text style={styles.subtitle}>Buat akun baru</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nama Lengkap</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nama lengkap Anda"
                                    placeholderTextColor={colors.textSecondary}
                                    value={form.name}
                                    onChangeText={(v) => updateField('name', v)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="nama@email.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={form.email}
                                    onChangeText={(v) => updateField('email', v)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary}
                                    value={form.password}
                                    onChangeText={(v) => updateField('password', v)}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity 
                                    style={styles.passwordBtn} 
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons 
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                                        size={20} 
                                        color={colors.textSecondary} 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nomor Telepon</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+62..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={form.phone}
                                    onChangeText={(v) => updateField('phone', v)}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nama Bisnis (Opsional)</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="storefront-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nama toko Anda"
                                    placeholderTextColor={colors.textSecondary}
                                    value={form.businessName}
                                    onChangeText={(v) => updateField('businessName', v)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tipe Bisnis</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                {businessTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[styles.typeChip, form.businessType === type.id && styles.typeChipActive]}
                                        onPress={() => updateField('businessType', type.id)}
                                    >
                                        <Text style={[styles.typeChipText, form.businessType === type.id && styles.typeChipTextActive]}>
                                            {type.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.buttonText}>Daftar</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.linkText}>
                                Sudah punya akun? <Text style={styles.linkBold}>Masuk</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
