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
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
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
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
        header: { alignItems: 'center', marginBottom: 36 },
        iconWrap: {
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        },
        title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
        subtitle: { fontSize: 15, color: colors.textSecondary },
        form: { gap: 16 },
        inputGroup: { gap: 6 },
        label: { fontSize: 13, fontWeight: '600', color: colors.text, marginLeft: 2 },
        inputWrap: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 14, height: 50,
        },
        inputIcon: { marginRight: 10 },
        input: { flex: 1, fontSize: 15, color: colors.text },
        button: {
            backgroundColor: colors.primary, borderRadius: 12, height: 50,
            justifyContent: 'center', alignItems: 'center', marginTop: 8,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        },
        buttonDisabled: { opacity: 0.7 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        linkButton: { alignItems: 'center', marginTop: 12 },
        linkText: { fontSize: 14, color: colors.textSecondary },
        linkBold: { color: colors.primary, fontWeight: '700' },
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="storefront" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>{t.welcomeBack}</Text>
                    <Text style={styles.subtitle}>{t.signInTo}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.email}</Text>
                        <View style={styles.inputWrap}>
                            <Ionicons name="mail-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t.emailPlaceholder}
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.password}</Text>
                        <View style={styles.inputWrap}>
                            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t.passwordPlaceholder}
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{t.signIn}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.linkText}>
                            {t.noAccount} <Text style={styles.linkBold}>{t.signUp}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
