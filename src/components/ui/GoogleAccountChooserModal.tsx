import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { User, Plus, X, ArrowRight, ShieldCheck, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface GoogleAccountItem {
  email: string;
  name: string;
  avatarColor: string;
}

interface GoogleAccountChooserModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name: string) => Promise<void>;
  loading?: boolean;
}

const DEFAULT_GOOGLE_ACCOUNTS: GoogleAccountItem[] = [
  {
    email: 'likithyadavgn@gmail.com',
    name: 'Likith Yadav',
    avatarColor: '#EA4335',
  }
];

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  visible,
  onClose,
  onSelectAccount,
  loading = false,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelect = async (account: { email: string; name: string }) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { }
    setSelectedEmail(account.email);
    setErrorMsg('');
    try {
      await onSelectAccount(account.email, account.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in with selected account.');
      setSelectedEmail(null);
    }
  };

  const handleCustomSubmit = async () => {
    const clean = customEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    const name = clean.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    await handleSelect({ email: clean, name });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-6 max-h-[85%] border-t border-[#E2DDD5]">
          {/* Top Bar with Google Branding */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              {/* Colorful Google G Logo */}
              <View className="w-9 h-9 rounded-full bg-white border border-[#E2DDD5] items-center justify-center mr-3">
                <Text className="text-lg font-black text-[#4285F4]">
                  G
                </Text>
              </View>
              <View>
                <Text className="text-xl text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                  Choose an account
                </Text>
                <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  to continue to Cognia Care
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-[#F1EBE1] items-center justify-center"
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View className="bg-[#FFF1F2] border border-[#FECDD3] p-3 rounded-xl mb-3">
              <Text className="text-[#BE123C] text-xs font-bold leading-snug">{errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px]">
            {/* Account List */}
            <View className="border border-[#EDE7DD] rounded-2xl overflow-hidden mb-4 bg-white">
              {DEFAULT_GOOGLE_ACCOUNTS.map((acc, index) => {
                const isSelected = selectedEmail === acc.email;
                return (
                  <TouchableOpacity
                    key={acc.email}
                    onPress={() => handleSelect(acc)}
                    disabled={loading}
                    activeOpacity={0.75}
                    className={`p-3.5 flex-row items-center justify-between ${index > 0 ? 'border-t border-[#F1EBE1]' : ''
                      } ${isSelected ? 'bg-[#F0FDF4]' : 'bg-white'}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: acc.avatarColor }}
                      >
                        <Text className="text-white text-base font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                          {acc.name.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                          {acc.name}
                        </Text>
                        <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                          {acc.email}
                        </Text>
                      </View>
                    </View>

                    {isSelected && loading ? (
                      <ActivityIndicator size="small" color="#16704A" />
                    ) : (
                      <View className="w-6 h-6 rounded-full bg-[#FAF8F5] border border-[#E2DDD5] items-center justify-center">
                        <ArrowRight size={12} color="#64748B" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Use Another Account Option */}
              <TouchableOpacity
                onPress={() => setShowCustomInput(!showCustomInput)}
                disabled={loading}
                activeOpacity={0.75}
                className="p-3.5 flex-row items-center border-t border-[#F1EBE1] bg-[#FAF8F5]"
              >
                <View className="w-10 h-10 rounded-full bg-white border border-[#CBD5E1] items-center justify-center mr-3">
                  <Plus size={16} color="#475569" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    Use another Google account
                  </Text>
                  <Text className="text-xs text-[#64748B] font-semibold">
                    Sign in with another personal or clinical email
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom Email Input Field (Expandable) */}
            {showCustomInput ? (
              <View className="mb-4 bg-[#FAF8F5] border-2 border-[#CBD5E1] p-3.5 rounded-2xl">
                <Text className="text-xs text-[#334155] font-bold mb-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  Enter Google Email Address
                </Text>
                <TextInput
                  value={customEmail}
                  onChangeText={(val) => {
                    setCustomEmail(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="yourname@gmail.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-3.5 py-2.5 mb-2.5 text-sm"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                />
                <TouchableOpacity
                  onPress={handleCustomSubmit}
                  disabled={loading}
                  className="bg-[#16704A] py-2.5 rounded-xl items-center flex-row justify-center"
                  style={{
                    shadowColor: '#16704A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text className="text-white text-xs font-bold mr-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Continue with this account
                      </Text>
                      <ArrowRight size={13} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Google Notice Disclaimer */}
            <View className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DD] mb-2 flex-row items-start">
              <ShieldCheck size={14} color="#16704A" style={{ marginTop: 2 }} />
              <Text className="text-[11px] text-[#64748B] ml-2 flex-1 leading-snug">
                To continue, Google shares your name, email address, and language preference with Cognia to securely identify your clinical caregiver account.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
