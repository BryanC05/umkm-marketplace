import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';

export default function LoginScreen({ navigation }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useLanguageStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert(t.error, t.fillAllFields);
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password);
        } catch (err) {
            let errorMessage = t.invalidCredentials;
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            Alert.alert(t.loginFailed, errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { 
            flex: 1, 
            backgroundColor: isDarkMode ? '#0f172a' : '#f3f5f7',
        },
        scroll: { 
            flexGrow: 1, 
            justifyContent: 'center', 
            padding: 24,
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: isDarkMode ? colors.primary : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDarkMode ? 0.1 : 0.08,
            shadowRadius: 12,
            elevation: 4,
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
        form: { gap: 16 },
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
        },
        passwordBtn: {
            padding: 4,
        },
        button: {
            backgroundColor: colors.primary,
            borderRadius: 8,
            height: 48,
            justifyContent: 'center', 
            alignItems: 'center', 
            marginTop: 8,
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
        decorRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 20,
            gap: 4,
        },
        decorDot: {
            width: 4,
            height: 4,
            borderRadius: 2,
        },
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Masuk</Text>
                        <Text style={styles.subtitle}>Selamat datang kembali</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="nama@email.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
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
                                    value={password}
                                    onChangeText={setPassword}
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

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.buttonText}>Masuk</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.linkText}>
                                Belum punya akun? <Text style={styles.linkBold}>Daftar</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.decorRow}>
                    <View style={[styles.decorDot, { backgroundColor: colors.primary + '40' }]} />
                    <View style={[styles.decorDot, { backgroundColor: colors.primary + '20' }]} />
                    <View style={[styles.decorDot, { backgroundColor: colors.primary + '10' }]} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
