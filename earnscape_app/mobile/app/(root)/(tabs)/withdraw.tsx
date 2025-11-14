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
import { fmt } from "@/constants/rewards";

interface WalletDetails {
  walletId: string;
  address: string;
  publicKey: string;
  isDeployed: boolean;
  balance: {
    wei: string;
    formatted: string;
    symbol: string;
  };
}

export default function WithdrawScreen() {
  const { user, login } = useGlobalContext();
  
  // UI State
  const [recipientInput, setRecipientInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [deploying, setDeploying] = useState(false);
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
      console.log("📊 Deployed:", data.data.isDeployed);
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
   * Poll wallet status until deployed
   */
  const pollUntilDeployed = async (walletId: string, maxAttempts = 12): Promise<boolean> => {
    console.log("🔄 Polling for deployment confirmation...");
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      try {
        const { data } = await api.get(`/api/wallet/${walletId}`);
        
        if (data.success && data.data.isDeployed) {
          console.log("✅ Deployment confirmed!");
          return true;
        }
        
        console.log(`⏳ Attempt ${i + 1}/${maxAttempts}: Still deploying...`);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }
    
    console.log("⚠️ Max polling attempts reached");
    return false;
  };

  /**
   * Deploy wallet
   */
  const deployWallet = async () => {
    if (!walletDetails?.walletId) return;

    Alert.alert(
      "Deploy Wallet",
      "Your wallet needs to be deployed before you can withdraw tokens. This is free (gasless via paymaster). Deploy now?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Deploy", 
          onPress: async () => {
            try {
              setDeploying(true);
              setError(null);

              console.log("🚀 Deploying wallet:", walletDetails.walletId);

              const { data } = await api.post(`/api/wallet/${walletDetails.walletId}/deploy`);

              if (!data.success) {
                throw new Error(data.error || "Deployment failed");
              }

              console.log("✅ Deployment transaction submitted:", data.data.transactionHash);

              // Show immediate success
              Alert.alert(
                "Deployment Submitted! 🚀",
                `Transaction: ${data.data.transactionHash?.slice(0, 10)}...\n\nWaiting for confirmation...`,
                [{ text: "OK" }]
              );

              // Poll until deployed
              const deployed = await pollUntilDeployed(walletDetails.walletId);
              
              if (deployed) {
                // Refresh wallet details
                await fetchWalletDetails();
                
                Alert.alert(
                  "Wallet Deployed! ✅",
                  "Your wallet is now deployed and ready for withdrawals!",
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert(
                  "Deployment In Progress",
                  "Deployment is taking longer than expected. Please refresh manually.",
                  [
                    { text: "Refresh", onPress: () => fetchWalletDetails() },
                    { text: "OK" }
                  ]
                );
              }

            } catch (err: any) {
              console.error("❌ Deployment error:", err);
              const message = err.response?.data?.error || err.response?.data?.details || err.message || "Deployment failed";
              setError(message);
              Alert.alert("Deployment Failed", message);
            } finally {
              setDeploying(false);
            }
          }
        },
      ]
    );
  };

  /**
   * Submit withdrawal request
   */
  const submitWithdraw = async () => {
    if (!valid || !walletDetails?.walletId || !user) return;
    
    // Check deployment first
    if (!walletDetails.isDeployed) {
      Alert.alert(
        "Wallet Not Deployed",
        "You need to deploy your wallet before withdrawing. Deploy now?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Deploy", onPress: deployWallet }
        ]
      );
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      console.log("💸 Submitting withdrawal...");
      console.log("  Wallet ID:", walletDetails.walletId);
      console.log("  To:", recipientInput);
      console.log("  Amount:", amount, "EARN");

      // Call backend withdraw endpoint
      const { data } = await api.post(`/api/wallet/${walletDetails.walletId}/withdraw`, {
        toAddress: recipientInput.trim(),
        amount: amount.toString(),
      });

      if (!data.success) {
        throw new Error(data.error || "Withdrawal failed");
      }

      console.log("✅ Withdrawal successful:", data.data.txHash);

      // Update local user state
      if (user) {
        const updated = {
          ...user,
          earnsClaimed: (user.earnsClaimed || 0) - amount,
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

      // Reset inputs
      setAmountInput("");
      setRecipientInput("");

      // Show success alert
      Alert.alert(
        "Withdrawal Successful! 💸",
        `${fmt(amount)} EARN sent to ${mask(recipientInput)}!\n\nTx: ${data.data.txHash?.slice(0, 10)}...`,
        [{ text: "OK" }]
      );

      // Hide success checkmark after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error("❌ Withdrawal error:", err);
      const message = err.response?.data?.error || err.response?.data?.details || err.message || "Withdrawal failed";
      setError(message);
      Alert.alert("Withdrawal Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  // Derived state
  const earnBalance = parseFloat(walletDetails?.balance?.formatted || "0");
  const starknetAddress = walletDetails?.address || "—";
  const walletDeployed = walletDetails?.isDeployed ?? false;

  // Input sanitization
  const cleanAmount = (raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const amount = useMemo(() => cleanAmount(amountInput), [amountInput]);
  
  // Validation
  const hasValidRecipient = recipientInput.trim().length > 0 && recipientInput.trim().startsWith("0x");
  const hasEnough = amount > 0 && amount <= earnBalance;
  const valid = hasValidRecipient && hasEnough && walletDeployed;

  const setMax = () => setAmountInput(fmt(earnBalance));

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
              Withdraw EARN
            </Text>
            <Text className="text-base font-rubik text-text-secondary mt-1">
              Transfer your EARN tokens to any address
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

          {/* Deployment Warning */}
          {!walletDeployed && (
            <View className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-xl mr-2">⚠️</Text>
                <Text className="text-yellow-400 font-rubik-semibold">
                  Wallet Not Deployed
                </Text>
              </View>
              <Text className="text-yellow-300 font-rubik text-sm mb-3">
                You must deploy your wallet before withdrawing tokens. Deployment is free (gasless via paymaster).
              </Text>
              <TouchableOpacity
                onPress={deployWallet}
                disabled={deploying}
                className={`rounded-xl py-3 items-center ${
                  deploying ? "bg-yellow-500/40" : "bg-yellow-500"
                }`}
              >
                {deploying ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#1a1a1a" />
                    <Text className="text-dark font-rubik-semibold ml-2">
                      Deploying...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-dark font-rubik-semibold">
                    Deploy Wallet (Gasless)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Balances */}
          <View className="flex-row gap-3 mb-6">
            <BalanceCard
              label="Available EARN"
              value={fmt(earnBalance)}
              sub="In Wallet"
            />
            <BalanceCard
              label="Wallet Status"
              value={walletDeployed ? "✅ Deployed" : "⚠️ Not Deployed"}
              sub={walletDeployed ? "Ready" : "Deploy First"}
            />
          </View>

          {/* Recipient Address Input */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-4">
            <Text className="text-sm text-text-secondary font-rubik mb-2">
              Recipient address
            </Text>

            <View className="bg-dark-200 rounded-xl px-4">
              <TextInput
                placeholder="0x..."
                value={recipientInput}
                onChangeText={setRecipientInput}
                className="py-4 text-white font-rubik text-sm"
                placeholderTextColor="#808080"
                editable={!submitting && walletDeployed}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Recipient Validation */}
            {recipientInput.length > 0 && !hasValidRecipient && (
              <Text className="text-red-400 mt-2 font-rubik text-sm">
                ❌ Invalid address (must start with 0x)
              </Text>
            )}
          </View>

          {/* Amount Input */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-4">
            <Text className="text-sm text-text-secondary font-rubik mb-2">
              Amount to withdraw
            </Text>

            <View className="flex-row items-center bg-dark-200 rounded-xl px-4">
              <TextInput
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0.00"
                value={amountInput}
                onChangeText={setAmountInput}
                className="flex-1 py-4 text-white font-rubik-semibold text-xl"
                placeholderTextColor="#808080"
                editable={!submitting && walletDeployed}
              />
              <TouchableOpacity 
                onPress={setMax} 
                className="bg-primary/20 px-3 py-1.5 rounded-lg"
                disabled={submitting || !walletDeployed || earnBalance === 0}
              >
                <Text className="text-primary font-rubik-semibold">MAX</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Validation */}
            {!hasEnough && amount > 0 && (
              <Text className="text-red-400 mt-2 font-rubik text-sm">
                ❌ You only have {fmt(earnBalance)} EARN
              </Text>
            )}
            {amount === 0 && amountInput.length > 0 && (
              <Text className="text-yellow-400 mt-2 font-rubik text-sm">
                ⚠️ Amount must be greater than 0
              </Text>
            )}
          </View>

          {/* Preview */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-6">
            <Text className="text-white font-rubik-semibold mb-3">Transaction Preview</Text>

            <Row label="From" value={mask(starknetAddress)} />
            <Row label="To" value={recipientInput ? mask(recipientInput) : "—"} />
            <Row label="Amount" value={`${fmt(amount)} EARN`} />
            <Row label="Gas fee" value="0 EARN (paymaster)" />
            <Row label="You sign" value="✅ Yes (via Privy)" />
          </View>

          {/* Withdraw Button */}
          <TouchableOpacity
            onPress={submitWithdraw}
            disabled={!valid || submitting || !walletDeployed}
            className={`rounded-2xl py-4 items-center ${
              !valid || submitting || !walletDeployed ? "bg-primary/40" : "bg-primary"
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
                {walletDeployed ? "Confirm Withdrawal" : "Deploy Wallet First"}
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
                <Text className="text-3xl">💸</Text>
              </View>
              <Text className="text-white font-rubik-semibold mt-3 text-lg">
                Withdrawal successful!
              </Text>
              <Text className="text-text-secondary font-rubik text-sm mt-1">
                Tokens sent to recipient
              </Text>
            </Animated.View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={fetchWalletDetails}
            disabled={loading || deploying}
            className="mt-4 py-3 items-center"
          >
            <Text className="text-primary font-rubik-semibold">
              {loading ? "Refreshing..." : "🔄 Refresh Balance"}
            </Text>
          </TouchableOpacity>

          {/* Info Footer */}
          <View className="mt-6 bg-dark-50/50 rounded-xl p-4">
            <Text className="text-text-muted font-rubik text-xs text-center">
              💡 Withdrawals are gasless! You sign the transaction via Privy, and the paymaster covers gas fees.
              {!walletDeployed && " Deploy your wallet first to enable withdrawals."}
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
      <Text className="text-white font-rubik-extrabold text-xl mt-1">{value}</Text>
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