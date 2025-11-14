import React, { useMemo, useRef, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { api } from "@/lib/api";
import { CLAIM_COPY, REWARD_CONVERSION, fmt, pointsToEarns } from "@/constants/rewards";

interface WalletDetails {
  walletId: string;
  address: string;
  isDeployed: boolean;
  balance: {
    wei: string;
    formatted: string;
    symbol: string;
  };
}

export default function ClaimScreen() {
  const { user, login } = useGlobalContext();
  
  // UI State
  const [pointsInput, setPointsInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  /**
   * Fetch wallet details from backend
   */
  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📡 Fetching wallet details...");
      
      // Get user's wallets
      const { data: listResponse } = await api.get("/api/wallet/list");
      
      if (!listResponse.success) {
        throw new Error(listResponse.error || "Failed to fetch wallets");
      }

      const wallets = listResponse.data?.wallets || [];
      
      if (wallets.length === 0) {
        throw new Error("No wallet found. Please sign in again.");
      }

      // Use first wallet and fetch details
      const walletId = wallets[0].id;
      const { data } = await api.get(`/api/wallet/${walletId}`);
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch wallet details");
      }

      console.log("✅ Wallet loaded:", data.data.address);
      setWalletDetails(data.data);

    } catch (err: any) {
      console.error("❌ Failed to fetch wallet:", err);
      const message = err.response?.data?.error || err.message || "Failed to load wallet";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit claim request
   */
  const submitClaim = async () => {
    if (!valid || !walletDetails?.walletId || !user) return;
    
    setSubmitting(true);
    setError(null);

    try {
      console.log("🎁 Submitting claim...");
      console.log("  Wallet ID:", walletDetails.walletId);
      console.log("  Amount:", earns, "EARN");

      // Call backend claim endpoint
      const { data } = await api.post(`/api/wallet/${walletDetails.walletId}/claim`, {
        amount: earns.toString(),
      });

      if (!data.success) {
        throw new Error(data.error || "Claim failed");
      }

      console.log("✅ Claim successful:", data.data.txHash);

      // Update local user state
      if (user) {
        const updated = {
          ...user,
          rewardPoints: user.rewardPoints - points,
          earnsClaimed: (user.earnsClaimed || 0) + earns,
        };
        await login(updated);
      }
      
      // Refresh wallet balance
      await fetchWalletDetails();

      // Show success animation
      setSuccess(true);
      successScale.setValue(0);
      Animated.spring(successScale, { 
        toValue: 1, 
        useNativeDriver: true, 
        friction: 6 
      }).start();

      // Reset input
      setPointsInput("");

      // Show success alert
      Alert.alert(
        "Claim Successful! 🎉",
        `${fmt(earns)} EARN tokens sent to your wallet!\n\nTx: ${data.data.txHash?.slice(0, 10)}...`,
        [{ text: "OK" }]
      );

      // Hide success checkmark after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error("❌ Claim error:", err);
      const message = err.response?.data?.error || err.response?.data?.details || err.message || "Claim failed";
      setError(message);
      Alert.alert("Claim Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  // Derived state
  const availablePoints = user?.rewardPoints ?? 0;
  const earnBalance = parseFloat(walletDetails?.balance?.formatted || "0");
  const starknetAddress = walletDetails?.address || "—";

  // Input sanitization
  const cleanPoints = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const points = useMemo(() => cleanPoints(pointsInput), [pointsInput]);
  const earns = useMemo(() => pointsToEarns(points), [points]);

  // Validation
  const hasEnough = points > 0 && points <= availablePoints;
  const meetsMin = points >= REWARD_CONVERSION.MIN_POINTS;
  const valid = hasEnough && meetsMin;

  const setMax = () => setPointsInput(String(availablePoints));

  // Loading screen
  if (loading) {
    return (
      <SafeAreaView className="bg-dark h-full">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-white font-rubik mt-4">Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-dark h-full">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-rubik-extrabold text-primary">
              {CLAIM_COPY.title}
            </Text>
            <Text className="text-base font-rubik text-text-secondary mt-1">
              {CLAIM_COPY.subtitle}
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-4 flex-row items-start">
              <Text className="text-red-400 font-rubik flex-1">{error}</Text>
              <TouchableOpacity 
                onPress={() => setError(null)}
                className="ml-2"
              >
                <Text className="text-red-400 text-xl font-bold">×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Balances */}
          <View className="flex-row gap-3 mb-6">
            <BalanceCard
              label="Your Points"
              value={String(availablePoints)}
              sub="Available"
            />
            <BalanceCard
              label="EARN Balance"
              value={fmt(earnBalance)}
              sub="In Wallet"
            />
          </View>

          {/* Input Section */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-4">
            <Text className="text-sm text-text-secondary font-rubik mb-2">
              Enter points to convert
            </Text>

            <View className="flex-row items-center bg-dark-200 rounded-xl px-4">
              <TextInput
                keyboardType="number-pad"
                inputMode="numeric"
                placeholder="0"
                value={pointsInput}
                onChangeText={setPointsInput}
                className="flex-1 py-4 text-white font-rubik-semibold text-xl"
                placeholderTextColor="#808080"
                editable={!submitting}
              />
              <TouchableOpacity 
                onPress={setMax} 
                className="bg-primary/20 px-3 py-1.5 rounded-lg"
                disabled={submitting || availablePoints === 0}
              >
                <Text className="text-primary font-rubik-semibold">MAX</Text>
              </TouchableOpacity>
            </View>

            {/* Calculator */}
            <View className="flex-row items-center justify-between mt-3">
              <Text className="text-text-secondary font-rubik">
                Rate: {REWARD_CONVERSION.POINTS_PER_EARNS} pts = 1 EARN
              </Text>
              <Text className="text-text-primary font-rubik-semibold">
                {fmt(earns)} EARN
              </Text>
            </View>

            {/* Validation Messages */}
            {!hasEnough && points > 0 && (
              <Text className="text-red-400 mt-2 font-rubik text-sm">
                ❌ You only have {availablePoints} points
              </Text>
            )}
            {!meetsMin && points > 0 && (
              <Text className="text-yellow-400 mt-1 font-rubik text-sm">
                ⚠️ Minimum claim is {REWARD_CONVERSION.MIN_POINTS} points
              </Text>
            )}
          </View>

          {/* Preview Section */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-6">
            <Text className="text-white font-rubik-semibold mb-3">Transaction Preview</Text>

            <Row label="You convert" value={`${points || 0} points`} />
            <Row label="You receive" value={`${fmt(earns)} EARN`} />
            <Row label="Gas fee" value="0 EARN (sponsored)" />
            <Row label="To address" value={mask(starknetAddress)} />
          </View>

          {/* Claim Button */}
          <TouchableOpacity
            onPress={submitClaim}
            disabled={!valid || submitting}
            className={`rounded-2xl py-4 items-center ${
              !valid || submitting ? "bg-primary/40" : "bg-primary"
            }`}
          >
            {submitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#1a1a1a" />
                <Text className="text-dark font-rubik-semibold text-base ml-2">
                  Processing...
                </Text>
              </View>
            ) : (
              <Text className="text-dark font-rubik-semibold text-base">
                Confirm Claim
              </Text>
            )}
          </TouchableOpacity>

          {/* Success Animation */}
          {success && (
            <Animated.View
              style={{ transform: [{ scale: successScale }] }}
              className="mt-6 items-center"
            >
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center border border-primary/40">
                <Text className="text-3xl">✅</Text>
              </View>
              <Text className="text-white font-rubik-semibold mt-3 text-lg">
                Claim successful!
              </Text>
              <Text className="text-text-secondary font-rubik text-sm mt-1">
                Tokens sent to your wallet
              </Text>
            </Animated.View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={fetchWalletDetails}
            disabled={loading}
            className="mt-4 py-3 items-center"
          >
            <Text className="text-primary font-rubik-semibold">
              {loading ? "Refreshing..." : "🔄 Refresh Balance"}
            </Text>
          </TouchableOpacity>

          {/* Info Footer */}
          <View className="mt-6 bg-dark-50/50 rounded-xl p-4">
            <Text className="text-text-muted font-rubik text-xs text-center">
              💡 Claims are gasless! Tokens are sent directly to your wallet by the hello-account.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function BalanceCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View className="flex-1 bg-dark-50 rounded-2xl border border-dark-200 p-4">
      <Text className="text-text-secondary font-rubik text-xs">{label}</Text>
      <Text className="text-white font-rubik-extrabold text-2xl mt-1">{value}</Text>
      <Text className="text-text-muted font-rubik text-xs mt-1">{sub}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-dark-200">
      <Text className="text-text-secondary font-rubik">{label}</Text>
      <Text className="text-white font-rubik-semibold">{value}</Text>
    </View>
  );
}

const mask = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr || "—";