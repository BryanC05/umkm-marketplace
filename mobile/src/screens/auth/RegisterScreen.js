import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';

export default function RegisterScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        isSeller: false, businessName: '', businessType: 'none',
    });
    const [loading, setLoading] = useState(false);
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
        if (form.isSeller && !form.businessName.trim()) {
            Alert.alert(t.error, `${t.businessName} ${t.isRequired || 'is required'}`);
            return;
        }
        setLoading(true);
        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                phone: form.phone.trim(),
                isSeller: form.isSeller,
                businessName: form.isSeller ? form.businessName.trim() : undefined,
                businessType: form.isSeller ? form.businessType : 'none',
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
        header: { alignItems: 'center', marginBottom: 24 },
        title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
        subtitle: { fontSize: 14, color: colors.textSecondary },
        form: { gap: 14 },
        inputGroup: { gap: 5 },
        label: { fontSize: 13, fontWeight: '600', color: colors.text, marginLeft: 2 },
        input: {
            backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 16, height: 50, fontSize: 15, color: colors.text,
        },
        sellerToggle: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 16, height: 50,
        },
        toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
        button: {
            backgroundColor: colors.primary, borderRadius: 12, height: 50,
            justifyContent: 'center', alignItems: 'center', marginTop: 8,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        },
        buttonDisabled: { opacity: 0.7 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        linkButton: { alignItems: 'center', marginTop: 16 },
        linkText: { fontSize: 14, color: colors.textSecondary },
        linkBold: { color: colors.primary, fontWeight: '700' },
        typeChip: {
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        },
        typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        typeChipText: { fontSize: 13, color: colors.text },
        typeChipTextActive: { color: '#fff' },
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>{t.createAccount}</Text>
                    <Text style={styles.subtitle}>{t.joinMSMEHub}</Text>
                </View>

                <View style={styles.form}>
                    {/* Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.fullName} *</Text>
                        <TextInput
                            style={styles.input} placeholder={t.fullNamePlaceholder} placeholderTextColor="#9ca3af"
                            value={form.name} onChangeText={(v) => updateField('name', v)}
                        />
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.email} *</Text>
                        <TextInput
                            style={styles.input} placeholder={t.emailPlaceholder} placeholderTextColor="#9ca3af"
                            value={form.email} onChangeText={(v) => updateField('email', v)}
                            keyboardType="email-address" autoCapitalize="none"
                        />
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.password} *</Text>
                        <TextInput
                            style={styles.input} placeholder={t.passwordPlaceholder} placeholderTextColor="#9ca3af"
                            value={form.password} onChangeText={(v) => updateField('password', v)}
                            secureTextEntry
                        />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t.phone} *</Text>
                        <TextInput
                            style={styles.input} placeholder="+62..." placeholderTextColor="#9ca3af"
                            value={form.phone} onChangeText={(v) => updateField('phone', v)}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Seller Toggle */}
                    <View style={styles.sellerToggle}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t.sellerMode}?</Text>
                        </View>
                        <Switch
                            value={form.isSeller}
                            onValueChange={(v) => updateField('isSeller', v)}
                            trackColor={{ true: colors.primary, false: colors.border }}
                            thumbColor="#fff"
                        />
                    </View>

                    {form.isSeller && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.businessName}</Text>
                                <TextInput
                                    style={styles.input} placeholder={t.businessName} placeholderTextColor="#9ca3af"
                                    value={form.businessName} onChangeText={(v) => updateField('businessName', v)}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t.businessType}</Text>
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
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{t.createAccount}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.linkText}>
                            {t.alreadyHaveAccount} <Text style={styles.linkBold}>{t.signIn}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
