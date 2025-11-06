import React, { useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import { usePrivy } from "@privy-io/expo";

const mask = (s?: string) =>
  s && s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s || "—";

export default function Profile() {
  const router = useRouter();
  const { user, isLogged, loading, login, clearLocalUser, refetch, bypassNextAutoLogin } =
    useGlobalContext();
  const { logout: privyLogout } = usePrivy();

  // Entrance anim
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

  if (loading) return null;
  if (!isLogged) return <Redirect href="/auth/sign-in" />;

  const email = user?.email || "—";
  const snAddr = user?.starknetAddress || "";
  const walletDeployed = !!user?.walletDeployed;

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${label} copied to clipboard`);
  };

  const handleSignOut = async () => {
    await privyLogout().catch(() => {});
    await clearLocalUser();
    bypassNextAutoLogin();
    await refetch();
    router.replace("/auth/sign-in");
  };

  return (
    <SafeAreaView className="bg-dark h-full">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-primary/20 items-center justify-center border border-primary/40">
              <Text className="text-3xl font-rubik-extrabold text-primary">E</Text>
            </View>
            <Text className="text-2xl font-rubik-extrabold text-white mt-4">
              Your Profile
            </Text>
            <Text className="text-text-secondary font-rubik mt-1">{email}</Text>
          </View>

          {/* Identity */}
          <Card>
            <Row
              label="Email"
              value={email}
              onCopy={() => handleCopy(email, "Email")}
            />
            <Row
              label="Starknet Wallet"
              value={walletDeployed ? mask(snAddr) : "Not deployed"}
              onCopy={() => walletDeployed && handleCopy(snAddr, "Wallet address")}
            />
          </Card>

          {/* Balances */}
          <View className="flex-row gap-3 my-6">
            <Stat label="Points" value={String(user?.rewardPoints ?? 0)} sub="Available" />
            <Stat label="EARNS" value={(user?.earnsClaimed ?? 0).toFixed(2)} sub="Balance" />
          </View>

          {/* Actions */}
          <Card>
            {/* We’ll auto-deploy via backend – hiding manual button for now */}
            <TouchableOpacity
              onPress={async () => {
                await refetch();
                Alert.alert("Refreshed", "Profile reloaded.");
              }}
              className="bg-dark-200 rounded-xl px-4 py-3 mb-3 border border-dark-300"
            >
              <Text className="text-white font-rubik-semibold text-center">Refetch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              className="bg-secondary/20 border border-secondary/40 rounded-xl px-4 py-3"
            >
              <Text className="text-secondary font-rubik-semibold text-center">Sign Out</Text>
            </TouchableOpacity>
          </Card>

          <Text className="text-center text-xs text-text-muted mt-6">
            Wallet deployment & balances are mocked until backend is connected.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4">{children}</View>
  );
}

function Row({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-text-secondary font-rubik">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Text className="text-white font-rubik-semibold">{value}</Text>
        {!!onCopy && (
          <TouchableOpacity
            onPress={onCopy}
            className="px-2 py-1 rounded-lg bg-dark-200 border border-dark-300"
          >
            <Text className="text-text-secondary font-rubik text-xs">Copy</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View className="flex-1 bg-dark-50 rounded-2xl border border-dark-200 p-4">
      <Text className="text-text-secondary font-rubik text-xs">{label}</Text>
      <Text className="text-white font-rubik-extrabold text-2xl mt-1">{value}</Text>
      <Text className="text-text-muted font-rubik text-xs mt-1">{sub}</Text>
    </View>
  );
}